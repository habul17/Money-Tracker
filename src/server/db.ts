import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
if (connectionString === undefined || connectionString === '') {
  throw new Error('DATABASE_URL is not set. Copy it from Neon into .env.local.')
}

// Hot reload re-runs this module on every edit. Without parking the pool on
// globalThis, each edit would open a fresh set of connections and leak the old ones.
const globalForDb = globalThis as unknown as { pool?: Pool }

export const pool = globalForDb.pool ?? new Pool({ connectionString })

if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool
