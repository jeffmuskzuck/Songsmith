import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;

function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function makePlaceholderSong({ genre, duration, prompt }, i) {
  const titles = [
    'Midnight Echoes',
    'Neon Skyline',
    'Waves and Wires',
    'Paper Airplanes',
    'Static and Starlight',
  ];
  const vibes = [
    'melancholic', 'uplifting', 'driving', 'dreamy', 'nostalgic', 'groovy'
  ];
  const structures = [
    'Verse 1\nChorus\nVerse 2\nChorus\nBridge\nChorus',
    'Intro\nVerse\nChorus\nVerse\nChorus\nOutro',
    'Verse\nPre-Chorus\nChorus\nVerse\nPre-Chorus\nChorus',
  ];

  const title = randomPick(titles) + ' #' + (i + 1);
  const vibe = randomPick(vibes);
  const structure = randomPick(structures);

  const lyricLines = [
    `In the ${genre} glow, we chase another night`,
    `Counting the minutes, making ${duration} feel right`,
    `Whispers of ${prompt || 'something true'} in the air`,
    `Hearts on the tempo, we’re almost there`,
  ];

  const lyrics = `${structure}\n\n` + lyricLines.join('\n');
  return { id: `${Date.now()}-${i}`, title, lyrics, genre, duration };
}

app.post('/api/generate', (req, res) => {
  const { genre = 'pop', duration = '2:30', prompt = '', count = 5 } = req.body || {};
  const n = Math.min(Math.max(Number(count) || 5, 1), 10);

  // TODO: Replace placeholder with real AI generation pipeline
  const songs = Array.from({ length: n }, (_, i) => makePlaceholderSong({ genre, duration, prompt }, i));
  res.json({ songs });
});

// Added GET support for /api/generate to allow link-based access and query params
app.get('/api/generate', (req, res) => {
  const { genre = 'pop', duration = '2:30', prompt = '', count = 5 } = req.query || {};
  const n = Math.min(Math.max(Number(count) || 5, 1), 10);
  const songs = Array.from({ length: n }, (_, i) => makePlaceholderSong({ genre, duration, prompt }, i));
  res.json({ songs });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Fallback to index.html for non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`AI Songsmith backend listening on http://localhost:${PORT}`);
  });
}

export default app;
