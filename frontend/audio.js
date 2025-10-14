// frontend/audio.js
// Web Audio + TTS helpers with simple arrangement from lyrics.
// Exposes on window:
// - setAudioOptions(opts), getAudioOptions()
// - playVoice(text)
// - playMelodyFromSeed(seed)
// - playFromLyrics(lyrics, seed, withBacking = true)
// - playCombined(lyrics, seed, withBacking = true) // starts melody/backing and TTS together
// - stopAllAudio()

(function () {
  // ---- Options ----
  const defaultOptions = {
    volume: 0.2,          // 0..1 master volume
    instrument: 'sine',   // 'sine' | 'triangle' | 'sawtooth'
    bpm: 95,              // beats per minute
    voiceRate: 1.0,       // TTS rate 0.1..10
    voicePitch: 1.0,      // TTS pitch 0..2
  };
  const opts = { ...defaultOptions };

  function setAudioOptions(newOpts = {}) {
    Object.assign(opts, newOpts);
  }
  function getAudioOptions() { return { ...opts }; }

  // ---- TTS (voice) ----
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  function playVoice(text) {
    if (!synth) return alert('Audio playback is not supported in this browser.');
    const u = new SpeechSynthesisUtterance(String(text || ''));
    u.rate = Number(opts.voiceRate) || 1.0;
    u.pitch = Number(opts.voicePitch) || 1.0;
    try { synth.cancel(); } catch(_) {}
    synth.speak(u);
  }

  // ---- Web Audio ----
  let audioCtx = null;
  let activeNodes = [];
  let masterGain = null;

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = AC ? new AC() : null;
      if (audioCtx) {
        masterGain = audioCtx.createGain();
        masterGain.gain.value = opts.volume;
        masterGain.connect(audioCtx.destination);
      }
    }
    return audioCtx;
  }

  async function resumeAudio() {
    const ctx = ensureAudio();
    if (!ctx) return null;
    if (ctx.state !== 'running') {
      try { await ctx.resume(); } catch (e) { console.warn('Audio resume failed', e); }
    }
    if (masterGain) masterGain.gain.value = opts.volume;
    return ctx;
  }

  function stopAllAudio() {
    try { if (synth) synth.cancel(); } catch (_) {}
    for (const n of activeNodes) {
      try { n.stop && n.stop(); } catch(_) {}
      try { n.disconnect && n.disconnect(); } catch(_) {}
    }
    activeNodes = [];
  }

  function noteFreq(semitonesFromA) { return 220 * Math.pow(2, semitonesFromA / 12); }

  // ---- Seeded RNG for deterministic choices ----
  function hash32(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rngFromSeed(seedStr) {
    let s = hash32(String(seedStr || 'seed')) || 1;
    return function rand() {
      // xorshift32
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17; s >>>= 0;
      s ^= s << 5;  s >>>= 0;
      return (s >>> 0) / 0xFFFFFFFF;
    };
  }

  // ---- Simple arrangement from lyrics ----
  function buildArrangementFromLyrics(lyrics, seed, bpm) {
    const rand = rngFromSeed(seed || 'melody');
    const scale = [0, 2, 4, 7, 9]; // pentatonic degrees from A
    const vowelOffset = { a: 2, e: 0, i: 4, o: -2, u: -4 };

    const words = String(lyrics || '').
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 256);

    let beat = 0; // in eighth-notes units (we’ll convert using bpm)
    const events = [];

    // Lead mapped per word (eighth-notes)
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const v = (w.match(/[aeiou]/i) || ['e'])[0].toLowerCase();
      const deg = scale[Math.floor(rand() * scale.length)];
      const oct = 0 + Math.floor(rand() * 3); // 0..2
      let semis = deg + 12 * oct + (vowelOffset[v] || 0);
      // occasional leap
      if (i % 7 === 0 && rand() < 0.3) semis += 12;
      events.push({ type: 'lead', beat, semis, lenBeats: 0.5, vowel: v });
      beat += 0.5; // eighth-note per word
    }

    // Total beats and bar length
    const totalBeats = Math.max(Math.ceil(beat), 32);

    // Backing: 4/4 drums + bass + chords
    for (let b = 0; b < totalBeats; b += 0.5) {
      // Hi-hat every 8th
      events.push({ type: 'hat', beat: b });
      // Kick on 1 & 3
      if (b % 4 === 0) events.push({ type: 'kick', beat: b });
      // Snare on 2 & 4
      if (b % 4 === 2) events.push({ type: 'snare', beat: b });
      // Bass + chord on downbeat of each bar
      if (b % 4 === 0) {
        const rootDeg = scale[Math.floor((b / 4) % scale.length)];
        const rootSemis = rootDeg; // A base
        events.push({ type: 'bass', beat: b, semis: rootSemis, lenBeats: 0.9 });
        events.push({ type: 'chord', beat: b, semis: rootSemis, lenBeats: 3.6 });
      }
    }

    return { events, bpm: bpm || 95 };
  }

  // ---- Scheduling helpers ----
  function scheduleKick(ctx, t) {
    const o = ctx.createOscillator(); o.type = 'sine';
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g).connect(masterGain);
    o.start(t); o.stop(t + 0.18);
    activeNodes.push(o, g);
  }
  function scheduleSnare(ctx, t) {
    const bufferSize = 2 * ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2200;
    const g = ctx.createGain(); g.gain.value = 0.5;
    noise.connect(hp).connect(g).connect(masterGain);
    noise.start(t); noise.stop(t + 0.12);
    activeNodes.push(noise, hp, g);
  }
  function scheduleHat(ctx, t, open = false) {
    const dur = open ? 0.15 : 0.05;
    const bufferSize = 2 * ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 9000;
    const g = ctx.createGain(); g.gain.value = open ? 0.22 : 0.12;
    noise.connect(hp).connect(g).connect(masterGain);
    noise.start(t); noise.stop(t + dur);
    activeNodes.push(noise, hp, g);
  }
  function scheduleBass(ctx, t, semis, lenSec) {
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + lenSec);
    o.frequency.value = noteFreq(semis);
    o.connect(lp).connect(g).connect(masterGain);
    o.start(t); o.stop(t + lenSec + 0.03);
    activeNodes.push(o, lp, g);
  }
  function scheduleChord(ctx, t, rootSemis, lenSec) {
    const triad = [0, 4, 7];
    for (const iv of triad) {
      const o = ctx.createOscillator(); o.type = 'triangle';
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.05);
      g.gain.linearRampToValueAtTime(0.0, t + lenSec);
      o.frequency.value = noteFreq(rootSemis + iv);
      o.connect(g).connect(masterGain);
      o.start(t); o.stop(t + lenSec + 0.06);
      activeNodes.push(o, g);
    }
  }
  function scheduleLead(ctx, t, semis, lenSec) {
    const o = ctx.createOscillator(); o.type = opts.instrument || 'sine';
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.02);
    g.gain.linearRampToValueAtTime(0.0, t + lenSec);
    o.frequency.value = noteFreq(semis);
    o.connect(g).connect(masterGain);
    o.start(t); o.stop(t + lenSec + 0.02);
    activeNodes.push(o, g);
  }

  async function playFromLyrics(lyrics, seed, withBacking = true) {
    const ctx = await resumeAudio();
    if (!ctx) return alert('Web Audio is not supported in this browser.');
    stopAllAudio(); // stop any previous

    const { events, bpm } = buildArrangementFromLyrics(lyrics, seed, opts.bpm);
    const spb = 60 / (bpm || opts.bpm); // seconds per beat (quarter-note)

    const t0 = ctx.currentTime + 0.06;
    for (const ev of events) {
      const t = t0 + ev.beat * (spb / 1); // beat is in quarter-notes
      switch (ev.type) {
        case 'kick': if (withBacking) scheduleKick(ctx, t); break;
        case 'snare': if (withBacking) scheduleSnare(ctx, t); break;
        case 'hat': if (withBacking) scheduleHat(ctx, t, ev.beat % 1 === 0); break;
        case 'bass': if (withBacking) scheduleBass(ctx, t, ev.semis, ev.lenBeats * spb); break;
        case 'chord': if (withBacking) scheduleChord(ctx, t, ev.semis, ev.lenBeats * spb); break;
        case 'lead': scheduleLead(ctx, t, ev.semis, ev.lenBeats * spb); break;
      }
    }
  }

  async function playCombined(lyrics, seed, withBacking = true) {
    await playFromLyrics(lyrics, seed, withBacking);
    if (synth) playVoice(lyrics);
  }

  // expose globals
  window.setAudioOptions = setAudioOptions;
  window.getAudioOptions = getAudioOptions;
  window.playVoice = playVoice;
  window.playMelodyFromSeed = async function(seed){
    const ctx = await resumeAudio();
    if (!ctx) return alert('Web Audio is not supported in this browser.');
    stopAllAudio();
    // fallback to a short seed-based arpeggio using lead only
    const scale = [0, 2, 4, 7, 9];
    const chars = String(seed || 'melody').split('');
    const t0 = ctx.currentTime + 0.05;
    let t = t0;
    for (let i = 0; i < Math.min(24, chars.length * 2); i++) {
      const ch = chars[i % chars.length].charCodeAt(0);
      const deg = scale[ch % scale.length];
      const oct = (ch >> 3) % 3;
      const sem = deg + 12 * oct;
      scheduleLead(ctx, t, sem, 0.22);
      t += 0.2;
    }
  };
  window.playFromLyrics = playFromLyrics;
  window.playCombined = playCombined;
  window.stopAllAudio = stopAllAudio;
})();
