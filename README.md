# AI Songsmith

A web application that generates fresh songs from a user prompt. Users select genre and duration, add an optional lyrical theme prompt, and receive 4–5 suggested songs. If they don’t like the results, they can request more suggestions.

## High-level architecture
- Frontend (vanilla HTML/CSS/JS): Collects user input and displays generated songs.
- Backend (Node.js + Express): Exposes POST /api/generate to return 4–5 song suggestions. Initially stubbed; later integrate AI music/lyrics generation.

## Getting started

Prerequisites:
- Node.js 18+ recommended

Setup:
1. Backend
   - cd backend
   - npm install
   - npm install --save express cors
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

## Roadmap
- Integrate AI lyrics generation (e.g., LLM) and melody/chord suggestion.
- Add song regeneration and refinement options.
- Persist user sessions and favorites.
- Add audio rendering pipeline (TTS/singing synthesis + accompaniment generation).
- Add authentication and rate limiting.

## Development
- Frontend: vanilla for simplicity; can migrate to a framework later.
- Backend: Express with CORS and JSON body parsing. Currently returns placeholder songs.

## License
MIT
