import { parseLedger } from '@/core/backup'
import { EMPTY_LEDGER } from '@/core/types'
import type { LedgerState } from '@/core/types'
import { pool } from './db'

export interface StoredLedger {
  state: LedgerState
  /** Bumped by every save. A save must name the version it started from. */
  version: number
}

export type SaveResult =
  | { ok: true; version: number }
  /** Someone else saved first (another tab or device). Carries what they saved. */
  | { ok: false; latest: StoredLedger }

export async function loadLedger(userId: string): Promise<StoredLedger> {
  // A brand-new account has no row yet. Creating it here means there is exactly
  // one place a ledger is born, and every later save can be a plain update.
  await pool.query(
    'insert into ledger (user_id, data) values ($1, $2) on conflict (user_id) do nothing',
    [userId, EMPTY_LEDGER],
  )
  const { rows } = await pool.query<{ data: unknown; version: number }>(
    'select data, version from ledger where user_id = $1',
    [userId],
  )
  return { state: parseLedger(rows[0].data), version: rows[0].version }
}

export async function saveLedger(
  userId: string,
  state: LedgerState,
  baseVersion: number,
): Promise<SaveResult> {
  const { rows } = await pool.query<{ version: number }>(
    `update ledger set data = $2, version = version + 1, updated_at = now()
     where user_id = $1 and version = $3
     returning version`,
    [userId, state, baseVersion],
  )
  if (rows.length === 1) return { ok: true, version: rows[0].version }
  return { ok: false, latest: await loadLedger(userId) }
}
