// frontend/audio.js
// Provides melody playback (Web Audio API) and voice TTS helpers in the browser.
// Exposes global functions on window: playVoice, playMelodyFromSeed, stopAllAudio

(function () {
  // ---- TTS (voice) fallback ----
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;

  function playVoice(text) {
    if (!synth) return alert('Audio playback is not supported in this browser.');
    stopAllAudio();
    const u = new SpeechSynthesisUtterance(String(text || ''));
    u.rate = 1.0;
    u.pitch = 1.0;
    synth.cancel();
    synth.speak(u);
  }

  // ---- Web Audio melody ----
  let audioCtx = null;
  let activeOscs = [];

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = AC ? new AC() : null;
    }
    return audioCtx;
  }

  async function resumeAudio() {
    const ctx = ensureAudio();
    if (!ctx) return null;
    if (ctx.state !== 'running') {
      try { await ctx.resume(); } catch (e) { console.warn('Audio resume failed', e); }
    }
    return ctx;
  }

  function stopAllAudio() {
    try { if (synth) synth.cancel(); } catch (_) {}
    for (const osc of activeOscs) {
      try { osc.stop(); } catch (_) {}
    }
    activeOscs = [];
  }

  function noteFreq(semitonesFromA) {
    return 220 * Math.pow(2, semitonesFromA / 12);
  }

  async function playMelodyFromSeed(seed) {
    const ctx = await resumeAudio();
    if (!ctx) return alert('Web Audio is not supported in this browser.');

    // Pentatonic mapping for a pleasant simple melody
    const scale = [0, 2, 4, 7, 9];
    const chars = String(seed || 'melody').split('');

    let t = ctx.currentTime + 0.05;
    const dur = 0.22;

    const master = ctx.createGain();
    master.gain.value = 0.20; // overall volume
    master.connect(ctx.destination);

    for (let i = 0; i < Math.min(32, chars.length * 2); i++) {
      const ch = chars[i % chars.length].charCodeAt(0);
      const degree = scale[ch % scale.length];
      const octave = 0 + ((ch >> 3) % 3); // 0..2
      const freq = noteFreq(degree + 12 * octave);

      const osc = ctx.createOscillator();
      osc.type = 'sine';

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0, t);
      env.gain.linearRampToValueAtTime(0.35, t + 0.02);
      env.gain.linearRampToValueAtTime(0.0, t + dur);

      osc.frequency.value = freq;
      osc.connect(env); env.connect(master);

      osc.start(t);
      osc.stop(t + dur + 0.02);
      activeOscs.push(osc);

      t += dur * 0.9; // slight overlap for fluidity
    }
  }

  // expose globals
  window.playVoice = playVoice;
  window.playMelodyFromSeed = playMelodyFromSeed;
  window.stopAllAudio = stopAllAudio;
})();
