# AI Songsmith

A web application that generates fresh songs from a user prompt. Users select genre and duration, add an optional lyrical theme prompt, and receive suggested songs. If they don’t like the results, they can request more suggestions.

## High-level architecture
- Frontend (vanilla HTML/CSS/JS): Collects user input, displays generated songs, and can play them aloud via the browser’s Speech Synthesis API.
- Backend (Node.js + Express): Exposes POST /api/generate to return song suggestions. Initially stubbed; later integrate AI music/lyrics generation.

## Getting started

Prerequisites:
- Node.js 18+ recommended

Setup:
1. Backend
   - cd backend
   - npm install
   - npm run dev
   - Server runs at http://localhost:5000
2. Frontend
   - Open frontend/index.html in your browser (or serve statically via any local server)
   - The UI expects the backend at http://localhost:5000

## API
POST /api/generate
Request JSON:
{
  "genre": "pop|rock|hiphop|jazz|...",
  "duration": "e.g., 2:30 or seconds",
  "prompt": "lyrical theme",
  "count": 4
}

Response JSON:
{
  "songs": [
    { "id": "...", "title": "...", "lyrics": "...", "genre": "...", "duration": "..." }
  ]
}

## Audio playback (prototype)
- The frontend adds Play/Stop buttons for each song that uses the browser’s built-in Text‑to‑Speech (Speech Synthesis API) to read the lyrics aloud.
- This provides immediate audible output without server keys. Some browsers/OSes may have different voices; if your browser does not support it, the Play button will show an alert.
- Future work can add server-side TTS to render downloadable audio (e.g., MP3) using a provider API.

## Development
- Frontend: vanilla for simplicity; can migrate to a framework later.
- Backend: Express with CORS and JSON body parsing. Currently returns placeholder songs with improved diversity and longer structures.

## Roadmap
- Integrate AI lyrics generation (e.g., LLM) and melody/chord suggestion.
- Server-side TTS/singing synthesis to produce downloadable audio files.
- Add song regeneration and refinement options.
- Persist user sessions and favorites.
- Add authentication and rate limiting.

## License
MIT
