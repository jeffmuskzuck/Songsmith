const form = document.getElementById('song-form');
const results = document.getElementById('results');
const moreBtn = document.getElementById('more');

let lastPayload = null;

function renderSongs(songs) {
  results.innerHTML = songs.map(s => `
    <div class="card">
      <h3>${s.title}</h3>
      <p><strong>Genre:</strong> ${s.genre} &nbsp; <strong>Duration:</strong> ${s.duration}</p>
      <pre style="white-space: pre-wrap">${s.lyrics}</pre>
    </div>
  `).join('');
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
