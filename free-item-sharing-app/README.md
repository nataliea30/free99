# neighbr2neighbr (Next.js + Postgres)

This app uses PostgreSQL for all server-backed features (auth, listings, users, conversations, messages).

## Local development

### 1) Configure local env

Create [`.env.local`](free-item-sharing-app/.env.local) in this folder:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB_NAME
# Use this for hosted DBs (Neon/Supabase):
POSTGRES_SSL=require
```

For local Docker Postgres example:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/free99
```

### 2) Install dependencies

```bash
pnpm install
```

### 3) Create schema and import demo data

```bash
pnpm run db:migrate-demo
```

`db:migrate-demo` now runs reset -> setup -> import in order.

Useful DB commands:

```bash
# Safe for production DBs: creates tables/indexes only
pnpm run db:setup

# DANGEROUS: drops all app tables
pnpm run db:reset

# Recreate schema tables/indexes (safe)
pnpm run db:setup

# Imports data/demo-db.json into current DATABASE_URL
pnpm run db:import-demo
```

### 4) Run app

```bash
pnpm dev
```

Open `http://localhost:3000`.

---

## Free deployment option A: Vercel + Neon

### A1) Push repo to GitHub

Make sure this app folder is committed, including [`vercel.json`](free-item-sharing-app/vercel.json) and DB scripts in [`scripts/`](free-item-sharing-app/scripts).

### A2) Create free Neon database

On Neon website:
1. Sign in.
2. Create Project (Free).
3. Create database (or use default).
4. Open **Connection Details**.
5. Copy the **pooled** connection string (`postgres://...`).

### A3) Import initial schema/data into Neon

Locally, point [`.env.local`](free-item-sharing-app/.env.local) to Neon URL and set SSL:

```bash
DATABASE_URL=<your_neon_connection_string>
POSTGRES_SSL=require
```

Run:

```bash
pnpm run db:migrate-demo
```

### A4) Deploy on Vercel (free)

On Vercel website:
1. **Add New Project** → import your GitHub repo.
2. Set **Root Directory** to [`free-item-sharing-app`](free-item-sharing-app).
3. Framework should detect Next.js (or use [`vercel.json`](free-item-sharing-app/vercel.json)).
4. In **Environment Variables**, add:
   - `DATABASE_URL` = same Neon connection string
   - `POSTGRES_SSL` = `require`
   - `GEMINI_API_KEY` (optional, only if using AI description route at [`app/api/ai/description/route.ts`](free-item-sharing-app/app/api/ai/description/route.ts))
5. Deploy.

### A5) Verify

After deploy:
- Open app URL.
- Sign up/login.
- Create listing.
- Confirm data persists across redeploys/restarts.

---

## Free deployment option B: Vercel + Supabase

### B1) Create free Supabase project

On Supabase website:
1. Create new project (Free plan).
2. Choose strong DB password when prompted.
3. Wait for project provisioning.
4. Go to **Project Settings** → **Database**.
5. Copy **Connection string** (URI).

### B2) Import schema/data from local

In [`.env.local`](free-item-sharing-app/.env.local):

```bash
DATABASE_URL=<your_supabase_connection_string>
POSTGRES_SSL=require
```

Then run:

```bash
pnpm run db:migrate-demo
```

### B3) Connect Vercel to Supabase

In Vercel env vars:
- `DATABASE_URL` = Supabase URI
- `POSTGRES_SSL` = `require`
- `GEMINI_API_KEY` optional

Deploy/redeploy.

---

## Important production notes

1. [`db:reset`](free-item-sharing-app/package.json) drops all app data. Never run it on production unless intentional.
2. [`db:migrate-demo`](free-item-sharing-app/package.json) is for initial seeding/migration from [`data/demo-db.json`](free-item-sharing-app/data/demo-db.json).
3. For later updates on production, use [`db:setup`](free-item-sharing-app/package.json) only.
4. Server Postgres client is implemented in [`lib/postgres-db.ts`](free-item-sharing-app/lib/postgres-db.ts).
5. Vercel build config is in [`vercel.json`](free-item-sharing-app/vercel.json).
