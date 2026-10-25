'use server'

import { parseLedger } from '@/core/backup'
import { getSession } from './auth'
import { saveLedger } from './ledger'
import type { SaveResult } from './ledger'

/**
 * Called by the browser after every change. The user id comes from the session
 * cookie, never from the request, so an account can only ever write its own ledger.
 */
export async function saveMyLedger(state: unknown, baseVersion: number): Promise<SaveResult> {
  const session = await getSession()
  if (session === null) throw new Error('You are signed out. Sign in again to keep saving.')
  if (!Number.isInteger(baseVersion)) throw new Error('Bad ledger version')
  // The browser is not trusted to send a well-formed ledger, same as a backup file.
  return saveLedger(session.user.id, parseLedger(state), baseVersion)
}
