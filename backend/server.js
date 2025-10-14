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
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function makeTitle(prompt) {
  const adjectives = [
    'Midnight', 'Neon', 'Electric', 'Golden', 'Velvet', 'Crimson', 'Lunar', 'Echoing', 'Starlit', 'Paper', 'Silver', 'Cerulean', 'Hidden', 'Wandering', 'Restless'
  ];
  const nouns = [
    'Echoes', 'Skyline', 'Waves', 'Wires', 'Airplanes', 'Starlight', 'Highways', 'Embers', 'Whispers', 'City Lights', 'Dreams', 'Static', 'Footsteps', 'Signals', 'Horizons'
  ];
  const maybePrompt = prompt && Math.random() < 0.5 ? ` ${String(prompt).split(' ').slice(0, 2).map(s=>s[0]?.toUpperCase()+s.slice(1)).join(' ')}` : '';
  return `${randomPick(adjectives)} ${randomPick(nouns)}${maybePrompt}`.trim();
}

function makeSectionLines(section, ctx) {
  const { genre, duration, prompt, vibe } = ctx;
  const imagery = [
    `city lights flicker like a metronome`,
    `footsteps echo in a midnight arcade`,
    `raindrops drum on neon chrome`,
    `shadows sway to a boulevard parade`,
    `paper planes climb the afterglow`,
    `radio static hums a secret code`,
    `stars align with a vinyl slow`,
    `engines purr down an endless road`,
  ];
  const actions = [
    `we chase the rhythm till it burns`,
    `we stitch our names between the turns`,
    `we fold the silence into chords`,
    `we spin the truth like record boards`,
    `we count the beats that pull us through`,
    `we trade the grey for something new`,
  ];
  const feelings = [
    `melancholic haze`, `restless blaze`, `dreamy phase`, `nostalgic maze`, `golden days`, `electric phase`
  ];
  const chorusHooks = [
    `hold on to ${prompt || 'this moment'}, let the chorus carry you`,
    `sing it like a secret only midnight ever knew`,
    `if we lose the map, the melody will guide us through`,
    `counting out ${duration}, but I only think of you`,
  ];

  const lines = [];
  if (section.toLowerCase().includes('chorus')) {
    const repeats = randomInt(4, 6);
    for (let i = 0; i < repeats; i++) {
      lines.push(randomPick(chorusHooks));
    }
  } else if (section.toLowerCase().includes('bridge')) {
    lines.push(
      `and in the ${randomPick(feelings)} we find a clue`,
      `${randomPick(imagery)}, a different view`,
      `change the key, change the hue`,
      `in ${genre} colors, we break through`
    );
  } else {
    // generic verse/pre-chorus/intro/outro
    const count = randomInt(4, 6);
    for (let i = 0; i < count; i++) {
      const pattern = randomInt(1, 3);
      if (pattern === 1) {
        lines.push(`${randomPick(imagery)}, ${randomPick(actions)}`);
      } else if (pattern === 2) {
        lines.push(`in this ${vibe} ${genre} room, ${randomPick(actions)}`);
      } else {
        lines.push(`timing set to ${duration}, ${randomPick(actions)}`);
      }
    }
  }
  return lines;
}

function makePlaceholderSong({ genre, duration, prompt }, i) {
  const vibes = ['melancholic','uplifting','driving','dreamy','nostalgic','groovy','moody','bright'];
  const structures = [
    ['Intro','Verse 1','Chorus','Verse 2','Chorus','Bridge','Chorus','Outro'],
    ['Verse 1','Pre-Chorus','Chorus','Verse 2','Pre-Chorus','Chorus'],
    ['Verse 1','Chorus','Verse 2','Chorus','Chorus']
  ];

  const vibe = randomPick(vibes);
  const structure = randomPick(structures);
  const title = makeTitle(prompt);

  let allLines = [];
  for (const section of structure) {
    allLines.push(section);
    allLines.push(...makeSectionLines(section, { genre, duration, prompt, vibe }));
    allLines.push('');
  }
  const lyrics = allLines.join('\n').trim();
  return { id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`, title, lyrics, genre, duration };
}

app.post('/api/generate', (req, res) => {
  const { genre = 'pop', duration = '2:30', prompt = '', count = 5 } = req.body || {};
  const n = Math.min(Math.max(Number(count) || 5, 1), 10);

  // Improved placeholder with enforced diversity per batch
  const seen = new Set();
  const songs = [];
  let attempts = 0;
  while (songs.length < n && attempts < n * 10) {
    const s = makePlaceholderSong({ genre, duration, prompt }, songs.length);
    const key = `${s.title}\n${s.lyrics.slice(0, 80)}`;
    if (!seen.has(key)) {
      seen.add(key);
      songs.push(s);
    }
    attempts++;
  }
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
