#!/usr/bin/env node

const { Client } = require("pg")
const fs = require("node:fs")
const path = require("node:path")

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) {
    return
  }

  const raw = fs.readFileSync(envPath, "utf-8")
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const equalsIndex = trimmed.indexOf("=")
    if (equalsIndex <= 0) continue

    const key = trimmed.slice(0, equalsIndex).trim()
    let value = trimmed.slice(equalsIndex + 1).trim()
    value = value.replace(/^['"]|['"]$/g, "")

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

loadEnvLocal()

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

const client = new Client({
  connectionString: databaseUrl,
  ssl:
    process.env.POSTGRES_SSL === "require"
      ? { rejectUnauthorized: false }
      : undefined,
})

const statements = [
  `
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text NOT NULL UNIQUE,
      name text NOT NULL,
      avatar_url text NOT NULL DEFAULT '',
      university jsonb NOT NULL,
      tags jsonb NOT NULL DEFAULT '[]'::jsonb,
      bio text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      password text NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS listings (
      id text PRIMARY KEY,
      title text NOT NULL,
      description text NOT NULL,
      images jsonb NOT NULL DEFAULT '[]'::jsonb,
      category text NOT NULL,
      condition text NOT NULL,
      tags jsonb NOT NULL DEFAULT '[]'::jsonb,
      status text NOT NULL,
      location text NOT NULL,
      seller_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      claimed_by_id text REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL,
      expires_at timestamptz NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS sessions (
      token text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS conversations (
      id text PRIMARY KEY,
      listing_id text NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      participant_ids jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS messages (
      id text PRIMARY KEY,
      conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body text NOT NULL,
      attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
      read boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_users_lower_email
    ON users (lower(email))
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id
    ON sessions (user_id)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_listings_seller_id
    ON listings (seller_id)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_listings_claimed_by_id
    ON listings (claimed_by_id)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_conversations_listing_id
    ON conversations (listing_id)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
    ON messages (conversation_id)
  `,
]

async function main() {
  await client.connect()

  for (const statement of statements) {
    await client.query(statement)
  }

  console.log("Postgres schema is ready")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await client.end()
  })
