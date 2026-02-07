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
  app/
    api/v1/endpoints/
    core/
    models/
    schemas/
    services/
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
uvicorn app.main:app --reload
```

Backend runs on `http://127.0.0.1:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://127.0.0.1:5173`.

## Notes

- This is a scaffold: endpoints and UI are intentionally lightweight and mock/in-memory.
- Replace in-memory stores with a real DB (e.g., PostgreSQL + SQLAlchemy) and JWT auth for production.
- Add real student email verification (SMTP/provider + OTP flow) before launch.

