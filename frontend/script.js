const form = document.getElementById('song-form');
const songsEl = document.getElementById('songs');
const errorEl = document.getElementById('error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  songsEl.innerHTML = '';

  const payload = {
    genre: document.getElementById('genre').value,
    duration: document.getElementById('duration').value,
    prompt: document.getElementById('prompt').value,
    count: Number(document.getElementById('count').value) || 4,
  };

  try {
    const res = await fetch('http://localhost:5000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();

    if (!Array.isArray(data.songs)) {
      throw new Error('Unexpected response shape');
    }

    for (const s of data.songs) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${s.title}</h3>
        <div class="small">${s.genre} • ${s.duration}</div>
        <pre style="white-space: pre-wrap;">${s.lyrics}</pre>
      `;
      songsEl.appendChild(card);
    }
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message || String(err);
  }
});
