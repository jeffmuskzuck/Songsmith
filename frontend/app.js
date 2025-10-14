const form = document.getElementById('song-form');
const results = document.getElementById('results');
const moreBtn = document.getElementById('more');

// Browser speech synthesis for audible playback
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let currentUtterance = null;

let lastPayload = null;
const API_URL = '/api/generate';

function stopPlayback() {
  if (synth) {
    synth.cancel();
  }
  currentUtterance = null;
}

function playLyrics(text) {
  if (!synth) return alert('Audio playback is not supported in this browser.');
  stopPlayback();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0; // 0.1–10
  u.pitch = 1.0; // 0–2
  u.onend = () => { currentUtterance = null; };
  currentUtterance = u;
  synth.speak(u);
}

function renderSongs(songs) {
  results.innerHTML = '';
  songs.forEach((s) => {
    const el = document.createElement('div');
    el.className = 'song';
    el.innerHTML = `
      <h3>${s.title}</h3>
      <small>${s.genre} • ${s.duration}</small>
      <div style="margin: 8px 0; display: flex; gap: 8px;">
        <button class="play">Play</button>
        <button class="stop">Stop</button>
      </div>
      <pre>${s.lyrics}</pre>
    `;

    const playBtn = el.querySelector('.play');
    const stopBtn = el.querySelector('.stop');

    playBtn.addEventListener('click', () => playLyrics(s.lyrics));
    stopBtn.addEventListener('click', () => stopPlayback());

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
