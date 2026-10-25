// Creates or updates every table the app needs. Safe to run again: it only adds
// what is missing. Run with `bun run db:migrate` (Bun reads .env.local itself).
import { readFile } from 'node:fs/promises'
import { getMigrations } from 'better-auth/db/migration'
import { auth } from '@/server/auth'
import { pool } from '@/server/db'

const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options)
for (const { table } of toBeCreated) console.log(`auth: creating table ${table}`)
for (const { table, fields } of toBeAdded) {
  console.log(`auth: adding ${Object.keys(fields).join(', ')} to ${table}`)
}
await runMigrations()

// Runs after the auth tables, because the ledger points at "user".
await pool.query(await readFile(new URL('../db/ledger.sql', import.meta.url), 'utf8'))
console.log('ledger: ready')

await pool.end()
