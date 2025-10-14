const form = document.getElementById('song-form');
const results = document.getElementById('results');
const moreBtn = document.getElementById('more');

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

function stopMelody() {
  for (const osc of activeOscs) {
    try { osc.stop(); } catch (_) {}
  }
  activeOscs = [];
}

function stopAllAudio() {
  if (synth) synth.cancel();
  currentUtterance = null;
  stopMelody();
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

function playMelodyFromSeed(seed) {
  const ctx = ensureAudio();
  if (!ctx) return alert('Web Audio is not supported in this browser.');
  stopMelody();
  const scale = [0, 2, 4, 7, 9];
  const chars = String(seed || 'melody').split('');
  let t = ctx.currentTime + 0.05;
  const dur = 0.22;
  const gain = ctx.createGain();
  gain.gain.value = 0.15;
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
    v.gain.linearRampToValueAtTime(0.3, t + 0.02);
    v.gain.linearRampToValueAtTime(0.0, t + dur);
    osc.frequency.value = freq;
    osc.connect(v); v.connect(gain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    activeOscs.push(osc);
    t += dur * 0.9;
  }
}

let lastPayload = null;

function renderSongs(songs) {
  results.innerHTML = songs.map(s => `
    <div class="card">
      <h3>${s.title}</h3>
      <p><strong>Genre:</strong> ${s.genre} &nbsp; <strong>Duration:</strong> ${s.duration}</p>
      <div style="margin: 8px 0; display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="play-voice">Play Voice</button>
        <button class="play-melody">Play Melody</button>
        <button class="stop">Stop</button>
      </div>
      <pre style="white-space: pre-wrap">${s.lyrics}</pre>
    </div>
  `).join('');

  // Wire up buttons after render
  const cards = Array.from(results.querySelectorAll('.card'));
  cards.forEach((card, idx) => {
    const s = songs[idx];
    card.querySelector('.play-voice').addEventListener('click', () => playVoice(s.lyrics));
    card.querySelector('.play-melody').addEventListener('click', () => playMelodyFromSeed(`${s.title} ${s.genre} ${s.duration}`));
    card.querySelector('.stop').addEventListener('click', () => stopAllAudio());
  });
}

async function generate(payload) {
  const res = await fetch('/api/generate-songs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to generate songs');
  const data = await res.json();
  return data.songs || [];
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const payload = {
    genre: fd.get('genre') || 'pop',
    duration: fd.get('duration') || '2:30',
    prompt: fd.get('prompt') || '',
    count: Number(fd.get('count') || 4)
  };
  lastPayload = payload;
  moreBtn.disabled = true;
  results.innerHTML = 'Generating…';
  try {
    const songs = await generate(payload);
    renderSongs(songs);
    moreBtn.disabled = false;
  } catch (err) {
    results.innerHTML = `<div class="card">Error: ${err.message}</div>`;
  }
});

moreBtn.addEventListener('click', async () => {
  if (!lastPayload) return;
  const payload = { ...lastPayload, seed: Date.now() };
  moreBtn.disabled = true;
  try {
    const songs = await generate(payload);
    renderSongs(songs);
  } catch (err) {
    results.innerHTML = `<div class="card">Error: ${err.message}</div>`;
  } finally {
    moreBtn.disabled = false;
  }
});
