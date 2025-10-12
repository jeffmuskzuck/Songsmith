const adjectives = [
  "Midnight",
  "Neon",
  "Golden",
  "Velvet",
  "Electric",
  "Silent",
  "Endless",
  "Crimson",
  "Flicker",
  "Silver"
];

const nouns = [
  "Dreams",
  "Echoes",
  "Lights",
  "Streets",
  "Shadows",
  "Skies",
  "Horizons",
  "Rhythms",
  "Heartbeat",
  "Whispers"
];

function seededRandom(seed) {
  let x = 0;
  for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function makeTitle(rng, genre, prompt) {
  const a = pick(rng, adjectives);
  const n = pick(rng, nouns);
  const p = prompt ? ` ${prompt.split(/\s+/)[0]}` : "";
  return `${a} ${n}${p}`.trim();
}

function makeLyrics(rng, { genre, duration, prompt }) {
  const lines = [];
  lines.push(`[Verse] In the ${genre} glow, ${prompt || "we go"}`);
  lines.push(`[Pre] Counting down the time (${duration || "?"}) in the flow`);
  lines.push(`[Chorus] Hold on, hold tight, through the city night`);
  lines.push(`[Chorus] ${prompt || "we run"}, hearts alight`);
  lines.push(`[Bridge] Echoes rise where stories start`);
  lines.push(`[Outro] Fade away but keep the heart`);
  return lines.join("\n");
}

function makePlaceholderSongs({ genre = "pop", duration = "2:30", prompt = "", count = 4, seed }) {
  const rng = seededRandom(String(seed || `${genre}|${duration}|${prompt}`));
  const songs = [];
  for (let i = 0; i < count; i++) {
    const title = makeTitle(rng, genre, prompt);
    const id = `${Date.now()}-${i}-${Math.floor(rng() * 1e6)}`;
    songs.push({
      id,
      title,
      lyrics: makeLyrics(rng, { genre, duration, prompt }),
      genre,
      duration
    });
  }
  return songs;
}

module.exports = { makePlaceholderSongs };
