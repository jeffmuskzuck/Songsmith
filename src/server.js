const express = require('express');
const cors = require('cors');
const path = require('path');
const { makePlaceholderSongs } = require('./songGenerator');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Generate songs
app.post('/api/generate-songs', (req, res) => {
  const { genre, duration, prompt, count = 4, seed } = req.body || {};
  try {
    const songs = makePlaceholderSongs({ genre, duration, prompt, count, seed });
    res.json({ songs });
  } catch (err) {
    res.status(400).json({ error: 'Invalid request', details: String(err && err.message || err) });
  }
});

// Serve static frontend
app.use('/', express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`AI Songsmith server listening on http://localhost:${PORT}`);
});
