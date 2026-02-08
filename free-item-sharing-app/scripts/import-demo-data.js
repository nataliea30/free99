#!/usr/bin/env node

const { Client } = require("pg")
const fs = require("node:fs/promises")
const fsSync = require("node:fs")
const path = require("node:path")

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local")
  if (!fsSync.existsSync(envPath)) {
    return
  }

  const raw = fsSync.readFileSync(envPath, "utf-8")
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

async function readDemoJson() {
  const demoPath = path.join(process.cwd(), "data", "demo-db.json")
  const raw = await fs.readFile(demoPath, "utf-8")
  return JSON.parse(raw)
}

async function main() {
  const demo = await readDemoJson()
  const validUserIds = new Set((demo.users ?? []).map((user) => user.id))
  const validListingIds = new Set((demo.listings ?? []).map((listing) => listing.id))

  await client.connect()
  await client.query("BEGIN")

  try {
    await client.query("TRUNCATE TABLE messages, conversations, sessions, listings, users RESTART IDENTITY CASCADE")

    for (const user of demo.users ?? []) {
      await client.query(
        `
          INSERT INTO users (
            id,
            email,
            name,
            avatar_url,
            university,
            tags,
            bio,
            created_at,
            password
          )
          VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9)
        `,
        [
          user.id,
          user.email,
          user.name,
          user.avatarUrl ?? "",
          JSON.stringify(user.university ?? {}),
          JSON.stringify(user.tags ?? []),
          user.bio ?? "",
          user.createdAt,
          user.password ?? "password",
        ]
      )
    }

    for (const listing of demo.listings ?? []) {
      await client.query(
        `
          INSERT INTO listings (
            id,
            title,
            description,
            images,
            category,
            condition,
            tags,
            status,
            location,
            seller_id,
            claimed_by_id,
            created_at,
            expires_at
          )
          VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13)
        `,
        [
          listing.id,
          listing.title,
          listing.description,
          JSON.stringify(listing.images ?? []),
          listing.category,
          listing.condition,
          JSON.stringify(listing.tags ?? []),
          listing.status,
          listing.location,
          listing.sellerId,
          listing.claimedById ?? null,
          listing.createdAt,
          listing.expiresAt,
        ]
      )
    }

    for (const session of demo.sessions ?? []) {
      await client.query(
        `
          INSERT INTO sessions (token, user_id, created_at)
          VALUES ($1, $2, $3)
        `,
        [session.token, session.userId, session.createdAt]
      )
    }

    for (const conversation of demo.conversations ?? []) {
      if (!validListingIds.has(conversation.listingId)) {
        continue
      }

      const participantIds = Array.from(
        new Set((conversation.participantIds ?? []).filter((id) => validUserIds.has(id)))
      )
      if (participantIds.length < 2) {
        continue
      }

      await client.query(
        `
          INSERT INTO conversations (id, listing_id, participant_ids, created_at)
          VALUES ($1, $2, $3::jsonb, $4)
        `,
        [
          conversation.id,
          conversation.listingId,
          JSON.stringify(participantIds),
          conversation.messages?.[0]?.createdAt ?? new Date().toISOString(),
        ]
      )

      for (const message of conversation.messages ?? []) {
        if (!validUserIds.has(message.senderId)) {
          continue
        }

        await client.query(
          `
            INSERT INTO messages (
              id,
              conversation_id,
              sender_id,
              body,
              attachments,
              read,
              created_at
            )
            VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
          `,
          [
            message.id,
            message.conversationId,
            message.senderId,
            message.body,
            JSON.stringify(message.attachments ?? []),
            Boolean(message.read),
            message.createdAt,
          ]
        )
      }
    }

    await client.query("COMMIT")
    console.log("Imported demo-db.json into Postgres")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await client.end()
  })
