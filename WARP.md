# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project scope
- Minimal prototype for generating placeholder song suggestions from a user prompt.
- Backend: Node.js (ESM) + Express. Serves API and static frontend.
- Frontend: vanilla HTML/JS/CSS in frontend/.

Repository layout (high-level)
- backend/: Express app exposing POST /api/generate and GET /health; exports app for tests.
- frontend/: Static client (index.html, scripts, styles) served by the backend in dev/prod.
- README.md: Setup, API contract, and roadmap.

Commands (Node 18+)
- Install deps
  ```bash path=null start=null
  cd backend && npm install
  ```
- Run (dev, auto-reload)
  ```bash path=null start=null
  cd backend && npm run dev
  ```
- Run (prod)
  ```bash path=null start=null
  cd backend && npm start
  ```
- Port
  - Defaults to 5000. Override with: `PORT=4000 npm start`
- Lint
  ```bash path=null start=null
  cd backend && npm run lint
  ```
- Format
  ```bash path=null start=null
  cd backend && npm run format
  ```
- Tests (Vitest + Supertest)
  - Run once
    ```bash path=null start=null
    cd backend && npm test
    ```
  - Watch
    ```bash path=null start=null
    cd backend && npm run test:watch
    ```
  - Single test (by name or file)
    ```bash path=null start=null
    cd backend && npm test -- -t "health"
    # or
    cd backend && npm test -- backend/test/server.test.js
    ```

API quick checks
- Health
  ```bash path=null start=null
  curl http://localhost:5000/health
  ```
- Generate placeholder songs
  ```bash path=null start=null
  curl -X POST http://localhost:5000/api/generate \
    -H 'Content-Type: application/json' \
    -d '{"genre":"pop","duration":"2:30","prompt":"city lights","count":4}'
  ```

High-level architecture and flow
- Backend (backend/server.js)
  - Express app with CORS and JSON parsing.
  - Routes:
    - GET /health -> { ok: true }
    - POST /api/generate -> returns N placeholder songs: { id, title, lyrics, genre, duration }
  - Placeholder generation:
    - makePlaceholderSong composes a structure (verse/chorus variants), picks a random title and vibe, and stitches lyric lines using genre, duration, and prompt. Randomness via randomPick.
    - A TODO marks where real AI generation will later plug in.
  - Static assets:
    - Serves frontend/ via express.static; wildcard route falls back to frontend/index.html for non-API paths.
  - Testability:
    - Exports app (ESM, type: module). The HTTP server only starts when NODE_ENV !== 'test'.
- Frontend (frontend/)
  - Static index.html, scripts (app.js/script.js), and styles.css. In dev/prod, access via http://localhost:5000.
- Tests (backend/test/server.test.js)
  - Vitest + Supertest verify /health and /api/generate contract by importing the Express app directly.

Tools and configs
- Lint: backend/.eslintrc.json (eslint:recommended, Node/ES2022)
- Format: .prettierrc.json at repo root
- Scripts: backend/package.json (start/dev/lint/format/test)

Notes
- CI is not configured in this repo.
- No CLAUDE, Cursor, or Copilot rule files are present.

Key references
- README.md: Getting started and API request/response shape
- backend/server.js: API and static serving
- backend/test/server.test.js: expected API behavior
- backend/package.json: scripts and dev tooling
- backend/.eslintrc.json and .prettierrc.json: lint/format
