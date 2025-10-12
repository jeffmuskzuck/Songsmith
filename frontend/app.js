const form = document.getElementById('song-form');
const results = document.getElementById('results');
const moreBtn = document.getElementById('more');

let lastPayload = null;
const API_URL = '/api/generate';

function renderSongs(songs) {
  results.innerHTML = '';
  songs.forEach((s) => {
    const el = document.createElement('div');
    el.className = 'song';
    el.innerHTML = `<h3>${s.title}</h3><small>${s.genre} • ${s.duration}</small><pre>${s.lyrics}</pre>`;
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
