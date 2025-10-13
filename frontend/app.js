const form = document.getElementById('song-form');
const results = document.getElementById('results');
const moreBtn = document.getElementById('more');
const stopAllBtn = document.getElementById('stop-all');

let lastPayload = null;
const API_URL = '/api/generate';

// Track DOM and timers per song for lyric highlighting
const songDom = new Map(); // songId -> { container, lastWord: number|null, timers: [] }

// --- Simple WebAudio synth engine ---
let audioCtx = null;
let activeNodes = [];

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function stopAllAudio() {
  activeNodes.forEach((n) => { try { n.stop && n.stop(0); n.disconnect && n.disconnect(); } catch(_){} });
  activeNodes = [];
}

function noteToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function scaleDegrees(rootMidi = 60) {
  // Major scale degrees (C major if rootMidi=60)
  const steps = [0, 2, 4, 5, 7, 9, 11, 12];
  return steps.map((s) => rootMidi + s);
}

function scheduleKick(ctx, t) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
  g.gain.setValueAtTime(1, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + 0.16);
  activeNodes.push(o, g);
}

function scheduleSnare(ctx, t) {
  const bufferSize = 2 * ctx.sampleRate * 0.2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource(); noise.buffer = buffer;
  const bp = ctx.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = 2000;
  const g = ctx.createGain(); g.gain.value = 0.4;
  noise.connect(bp).connect(g).connect(ctx.destination);
  noise.start(t); noise.stop(t + 0.1);
  activeNodes.push(noise, bp, g);
}

function scheduleHat(ctx, t, open = false) {
  const dur = open ? 0.15 : 0.05;
  const bufferSize = 2 * ctx.sampleRate * dur;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource(); noise.buffer = buffer;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000;
  const g = ctx.createGain(); g.gain.value = open ? 0.2 : 0.1;
  noise.connect(hp).connect(g).connect(ctx.destination);
  noise.start(t); noise.stop(t + dur);
  activeNodes.push(noise, hp, g);
}

function scheduleBass(ctx, t, freq, dur, out) {
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 200;
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.25, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.frequency.value = freq;
  o.connect(lp).connect(g).connect(out || ctx.destination);
  o.start(t); o.stop(t + dur + 0.02);
  activeNodes.push(o, lp, g);
}

function scheduleChord(ctx, t, rootMidi, dur, out) {
  const intervals = [0, 4, 7]; // major triad
  intervals.forEach((iv) => {
    const o = ctx.createOscillator(); o.type = 'triangle';
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.15, t + 0.05);
    g.gain.linearRampToValueAtTime(0.0, t + dur);
    o.frequency.value = noteToFreq(rootMidi + iv);
    o.connect(g).connect(out || ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
    activeNodes.push(o, g);
  });
}

function vowelFormant(vowel) {
  // Rough formant centers (F1)
  const map = { 'a': 800, 'e': 500, 'i': 300, 'o': 500, 'u': 350 };
  return map[vowel] || 600;
}

function scheduleVocalLead(ctx, t, freq, dur, char) {
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  const vibrato = ctx.createOscillator(); vibrato.frequency.value = 5 + Math.random() * 2;
  const vGain = ctx.createGain(); vGain.gain.value = 6 + Math.random() * 4; // cents
  const g = ctx.createGain();
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
  bp.frequency.value = vowelFormant((char || 'a').toLowerCase());

  const detune = o.detune; // in cents
  vibrato.connect(vGain);
  vGain.connect(detune);

  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.4, t + 0.04);
  g.gain.linearRampToValueAtTime(0.05, t + dur * 0.7);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);

  o.frequency.value = freq;
  o.connect(bp).connect(g).connect(ctx.destination);
  vibrato.start(t); vibrato.stop(t + dur);
  o.start(t); o.stop(t + dur + 0.02);
  activeNodes.push(o, vibrato, vGain, bp, g);
}

function lyricsToSpans(lyrics) {
  let wi = 0;
  const lines = String(lyrics || '').split(/\n+/);
  let html = '';
  for (let li = 0; li < lines.length; li++) {
    const words = lines[li].trim().length ? lines[li].split(/(\s+)/) : [];
    for (const token of words) {
      if (/^\s+$/.test(token)) { html += token; continue; }
      if (token === '') continue;
      html += `<span class="w" data-wi="${wi}">${token}</span>`;
      wi++;
    }
    if (li < lines.length - 1) html += '\n';
  }
  return { html, total: wi };
}

function buildArrangementFromLyrics(lyrics, bpm = 95, keyRootMidi = 60) {
  const degrees = scaleDegrees(keyRootMidi);
  const lines = String(lyrics || '').split(/\n+/).filter(Boolean);
  const arrangement = [];
  const markers = [];
  let beat = 0;
  let windex = 0;
  for (const line of lines) {
    // pick a base degree for the line
    const hash = Array.from(line).reduce((a, c) => a + c.charCodeAt(0), 0);
    const base = degrees[hash % degrees.length];
    const words = line.split(/\s+/).filter(Boolean).slice(0, 8);
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const ch = (w.match(/[aeiou]/i) || ['a'])[0];
      const deg = degrees[(hash + i) % degrees.length];
      const midi = deg + (i % 4 === 3 ? 12 : 0); // little leaps
      arrangement.push({ type: 'lead', beat, midi, vowel: ch, len: 0.5, windex });
      markers.push({ beat, windex });
      windex++;
      beat += 0.5; // eighth-note per word
    }
    beat = Math.ceil(beat); // snap to next beat
  }
  // Add 8 bars of drums/bass/chords
  const totalBeats = Math.max(beat + 4, 32);
  for (let b = 0; b < totalBeats; b += 0.5) {
    if (b % 4 === 0) arrangement.push({ type: 'kick', beat: b });
    if (b % 4 === 2) arrangement.push({ type: 'snare', beat: b });
    arrangement.push({ type: 'hat', beat: b });
    if (b % 4 === 0) {
      const root = degrees[((b / 4) | 0) % degrees.length];
      arrangement.push({ type: 'bass', beat: b, midi: root, len: 0.95 });
      arrangement.push({ type: 'chord', beat: b, midi: root, len: 3.8 });
    }
  }
  return { arrangement, bpm, markers };
}

function clearSongTimers(songId) {
  const st = songDom.get(songId);
  if (!st) return;
  (st.timers || []).forEach((id) => clearTimeout(id));
  st.timers = [];
}

function setActiveWord(songId, windex) {
  const st = songDom.get(songId);
  if (!st) return;
  const root = st.container;
  if (st.lastWord != null) {
    const prev = root.querySelector(`[data-wi="${st.lastWord}"]`);
    if (prev) prev.classList.remove('on');
  }
  if (windex != null && windex >= 0) {
    const cur = root.querySelector(`[data-wi="${windex}"]`);
    if (cur) cur.classList.add('on');
    st.lastWord = windex;
  } else {
    st.lastWord = null;
  }
}

function playSong(song) {
  const ctx = getCtx();
  const t0 = ctx.currentTime + 0.1;
const { arrangement, bpm, markers } = buildArrangementFromLyrics(song.lyrics, 95);
  const spb = 60 / bpm;

  // Clear any prior UI timers for this song
  clearSongTimers(song.id);

  arrangement.forEach((ev) => {
    const t = t0 + ev.beat * spb;
    switch (ev.type) {
      case 'kick': return scheduleKick(ctx, t);
      case 'snare': return scheduleSnare(ctx, t);
      case 'hat': return scheduleHat(ctx, t, ev.beat % 1 === 0);
      case 'bass': return scheduleBass(ctx, t, noteToFreq(ev.midi), ev.len * spb);
      case 'chord': return scheduleChord(ctx, t, ev.midi, ev.len * spb);
      case 'lead': return scheduleVocalLead(ctx, t, noteToFreq(ev.midi), ev.len * spb, ev.vowel);
    }
  });

  // Schedule lyric highlights using the same clock
  const st = songDom.get(song.id);
  if (st) {
    markers.forEach((mk) => {
      const t = t0 + mk.beat * spb;
      const ms = Math.max(0, (t - ctx.currentTime) * 1000);
      const tid = setTimeout(() => setActiveWord(song.id, mk.windex), ms);
      st.timers.push(tid);
    });
    const lastBeat = markers.length ? Math.max(...markers.map(m => m.beat)) : 0;
    const endT = t0 + (lastBeat + 1) * spb;
    const endMs = Math.max(0, (endT - ctx.currentTime) * 1000);
    const tid = setTimeout(() => setActiveWord(song.id, null), endMs);
    st.timers.push(tid);
  }
}

function renderSongs(songs) {
  results.innerHTML = '';
  songs.forEach((s) => {
    const el = document.createElement('div');
    el.className = 'song';
const { html } = lyricsToSpans(s.lyrics);
    el.innerHTML = `
      <h3>${s.title}</h3>
      <small>${s.genre} • ${s.duration}</small>
      <div style="margin:0.5rem 0;">
        <button class="play">Play</button>
      </div>
      <div class="lyrics" data-song-id="${s.id}">${html}</div>
    `;
const playBtn = el.querySelector('.play');
    playBtn.addEventListener('click', () => playSong(s));
    const container = el.querySelector('.lyrics');
    songDom.set(s.id, { container, lastWord: null, timers: [] });
    results.appendChild(el);
  });
}

async function generate(payload) {
  try {
    results.innerHTML = '<p>Generating...</p>';
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error('Request failed');
    const data = await r.json();
    renderSongs(data.songs || []);
    moreBtn.disabled = false;
  } catch (err) {
    console.error(err);
    results.innerHTML = '<p style="color:#fca5a5">Failed to generate songs. Is the backend running on port 5000?</p>';
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const payload = {
    genre: document.getElementById('genre').value,
    duration: document.getElementById('duration').value,
    prompt: document.getElementById('prompt').value,
    count: Number(document.getElementById('count').value || 5),
  };
  lastPayload = payload;
  generate(payload);
});

moreBtn.addEventListener('click', () => {
  if (lastPayload) generate(lastPayload);
});

stopAllBtn.addEventListener('click', () => {
  stopAllAudio();
  songDom.forEach((st, songId) => {
    clearSongTimers(songId);
    setActiveWord(songId, null);
  });
});
