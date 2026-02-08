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

const resetSql = `
  DROP TABLE IF EXISTS messages, conversations, sessions, listings, users CASCADE
`

async function main() {
  await client.connect()
  await client.query(resetSql)
  console.log("Postgres schema dropped")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await client.end()
  })

