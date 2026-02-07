# Free99 — FastAPI + React Scaffold

Scaffolding for a **college-only free giveaway marketplace** with:

- Student email verification + account creation
- Login/auth foundation
- Listings feed with image, poster, tags/flairs, claim state, claim count
- Claim flow
- Separate pages for creating listings, viewing claimed items, managing your own listings
- Messaging section (Instagram-style thread list + conversation area scaffold)

## Project Structure

```text
backend/
  alembic/
    versions/
  alembic.ini
  app/
    api/v1/endpoints/
    core/
    db/
    models/
    schemas/
    main.py
  requirements.txt
  .env.example

frontend/
  src/
    api/
    components/
    pages/
    App.jsx
    main.jsx
    styles.css
  package.json
  vite.config.js
  .env.example
```

## Quick Start

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# run migrations (requires local postgres running and DATABASE_URL configured)
alembic upgrade head

uvicorn app.main:app --reload
```

Backend runs on `http://127.0.0.1:8000`.

### Database + Redis

- PostgreSQL is the system of record for users, listings, claims, threads, and messages.
- Redis URL is configured for ephemeral workflows (verification/rate-limit/session acceleration hooks).

Default local connection values are in [`backend/.env.example`](backend/.env.example:1).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://127.0.0.1:5173`.

## API Compatibility Notes

- Existing endpoint paths were preserved:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/verify-email`
  - `POST /api/v1/auth/login`
  - `GET/POST /api/v1/listings`
  - `POST /api/v1/listings/{listing_id}/claim`
  - `GET /api/v1/listings/claimed/me`
  - `GET /api/v1/listings/mine`
  - `GET /api/v1/messages/threads`
  - `POST /api/v1/messages/threads?participant_id=...`
  - `GET /api/v1/messages/{thread_id}`
  - `POST /api/v1/messages`
- Response shapes used by the current React client are preserved for backward compatibility.

## Notes

- Persistence layer now uses SQLAlchemy + Alembic with PostgreSQL models and migrations.
- Messaging storage uses normalized `threads`, `thread_participants`, and `messages` tables to support scale-out and realtime expansion.
- Student verification code is still mock (`123456`) for scaffolding; replace with provider-backed OTP for production.
