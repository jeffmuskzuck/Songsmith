const form = document.getElementById('song-form');
const results = document.getElementById('results');
const moreBtn = document.getElementById('more');
const stopAllBtn = document.getElementById('stop-all');

let lastPayload = null;
const API_URL = '/api/generate';

// Voice playback via browser TTS
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let currentUtterance = null;

// Melody playback via Web Audio API
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
  if (synth) synth.cancel();
  currentUtterance = null;
  for (const osc of activeOscs) {
    try { osc.stop(); } catch (_) {}
  }
  activeOscs = [];
}

function playVoice(text) {
  if (!synth) return alert('Audio playback is not supported in this browser.');
  stopAllAudio();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0;
  u.pitch = 1.0;
  u.onend = () => { currentUtterance = null; };
  currentUtterance = u;
  synth.speak(u);
}

function noteFreq(semitonesFromA) {
  return 220 * Math.pow(2, semitonesFromA / 12);
}

async function playMelodyFromSeed(seed) {
  const ctx = await resumeAudio();
  if (!ctx) return alert('Web Audio is not supported in this browser.');
  // Simple pleasant pentatonic mapping from seed
  const scale = [0, 2, 4, 7, 9];
  const chars = String(seed || 'melody').split('');
  let t = ctx.currentTime + 0.05;
  const dur = 0.22;
  const gain = ctx.createGain();
  gain.gain.value = 0.2;
  gain.connect(ctx.destination);
  for (let i = 0; i < Math.min(32, chars.length * 2); i++) {
    const ch = chars[i % chars.length].charCodeAt(0);
    const degree = scale[ch % scale.length];
    const octave = 0 + ((ch >> 3) % 3);
    const freq = noteFreq(degree + 12 * octave);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const v = ctx.createGain();
    v.gain.setValueAtTime(0.0, t);
    v.gain.linearRampToValueAtTime(0.35, t + 0.02);
    v.gain.linearRampToValueAtTime(0.0, t + dur);
    osc.frequency.value = freq;
    osc.connect(v); v.connect(gain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    activeOscs.push(osc);
    t += dur * 0.9;
  }
}

function seedForSong(s) {
  const key = `songseed:${s.id || s.title}`;
  const persisted = localStorage.getItem(key);
  if (persisted) return persisted;
  const seed = `${s.title} ${s.genre} ${s.duration}`;
  localStorage.setItem(key, seed);
  return seed;
}

function renderSongs(songs) {
  results.innerHTML = '';
  songs.forEach((s) => {
    const el = document.createElement('div');
    el.className = 'song';
    el.innerHTML = `
      <h3>${s.title}</h3>
      <small>${s.genre} • ${s.duration}</small>
      <div style="margin: 8px 0; display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="play-combined">Play Combined</button>
        <button class="play-voice">Play Voice</button>
        <button class="play-melody">Play Melody</button>
        <button class="stop">Stop</button>
      </div>
      <pre>${s.lyrics}</pre>
    `;

    const playCombinedBtn = el.querySelector('.play-combined');
    const playVoiceBtn = el.querySelector('.play-voice');
    const playMelodyBtn = el.querySelector('.play-melody');
    const stopBtn = el.querySelector('.stop');

    const seed = seedForSong(s);
    playCombinedBtn.addEventListener('click', () => window.playCombined(s.lyrics, seed, window.__withBacking?.() ?? true));
    playVoiceBtn.addEventListener('click', () => window.playVoice(s.lyrics));
    playMelodyBtn.addEventListener('click', () => window.playFromLyrics(s.lyrics, seed, window.__withBacking?.() ?? true));
    stopBtn.addEventListener('click', () => window.stopAllAudio());

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



// Optional Stop All button handler if present
if (stopAllBtn) stopAllBtn.addEventListener('click', () => stopAllAudio());
