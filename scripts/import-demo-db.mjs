import fs from "node:fs/promises"
import path from "node:path"
import { Pool } from "pg"

const dbStateId = "default"
const sourcePath = path.join(process.cwd(), "data", "demo-db.json")

const fail = (message) => {
  console.error(`\n[import-demo-db] ${message}`)
  process.exit(1)
}

const readSourceData = async () => {
  let raw
  try {
    raw = await fs.readFile(sourcePath, "utf-8")
  } catch {
    fail(`Could not read source file at ${sourcePath}`)
  }

  try {
    return JSON.parse(raw)
  } catch {
    fail("Source file is not valid JSON.")
  }
}

const validateShape = (data) => {
  if (!data || typeof data !== "object") {
    fail("Source JSON must be an object.")
  }
  const requiredArrays = ["users", "listings", "sessions", "conversations"]
  for (const key of requiredArrays) {
    if (!Array.isArray(data[key])) {
      fail(`Source JSON is missing required array: ${key}`)
    }
  }
}

const main = async () => {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    fail("DATABASE_URL is missing. Set it in your environment or .env.local.")
  }

  const data = await readSourceData()
  validateShape(data)

  const pool = new Pool({ connectionString, max: 1 })

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const existing = await pool.query("SELECT data FROM app_state WHERE id = $1", [dbStateId])

    if (existing.rows[0]?.data) {
      const backupDir = path.join(process.cwd(), "data")
      const backupPath = path.join(
        backupDir,
        `app-state-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
      )
      await fs.mkdir(backupDir, { recursive: true })
      await fs.writeFile(backupPath, JSON.stringify(existing.rows[0].data, null, 2), "utf-8")
      console.log(`[import-demo-db] Existing DB state backed up to ${backupPath}`)
    }

    await pool.query(
      `
        INSERT INTO app_state (id, data, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `,
      [dbStateId, JSON.stringify(data)]
    )

    console.log("[import-demo-db] Import complete.")
    console.log(
      `[import-demo-db] users=${data.users.length}, listings=${data.listings.length}, sessions=${data.sessions.length}, conversations=${data.conversations.length}`
    )
  } finally {
    await pool.end()
  }
}

await main()
