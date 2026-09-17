import type { Debt, LedgerState, Transaction, TransactionKind } from './types'

const KINDS: TransactionKind[] = ['opening', 'income', 'expense', 'payment', 'adjustment']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseDebt(value: unknown): Debt {
  if (!isRecord(value)) throw new Error('A debt entry is not an object')
  const { id, name, originalAmount, archivedAt } = value
  if (typeof id !== 'string' || id === '') throw new Error('A debt is missing its id')
  if (typeof name !== 'string') throw new Error('A debt is missing its name')
  if (typeof originalAmount !== 'number' || !Number.isInteger(originalAmount)) {
    throw new Error(`Debt "${name}" has a non-integer original amount`)
  }
  return {
    id,
    name,
    originalAmount,
    ...(typeof archivedAt === 'string' ? { archivedAt } : {}),
  }
}

function parseTransaction(value: unknown): Transaction {
  if (!isRecord(value)) throw new Error('A transaction entry is not an object')
  const { id, kind, amount, date, createdAt, note, debtId } = value
  if (typeof id !== 'string' || id === '') throw new Error('A transaction is missing its id')
  if (typeof kind !== 'string' || !KINDS.includes(kind as TransactionKind)) {
    throw new Error(`Unknown transaction type "${String(kind)}"`)
  }
  if (typeof amount !== 'number' || !Number.isInteger(amount)) {
    throw new Error('A transaction has a non-integer amount')
  }
  if (typeof date !== 'string') throw new Error('A transaction is missing its date')

  const base = {
    id,
    amount,
    date,
    createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
    ...(typeof note === 'string' && note !== '' ? { note } : {}),
  }

  if (kind === 'payment' || kind === 'adjustment') {
    if (typeof debtId !== 'string' || debtId === '') {
      throw new Error(`A ${kind} is not linked to a debt`)
    }
    return { ...base, kind, debtId }
  }
  return { ...base, kind: kind as 'opening' | 'income' | 'expense' }
}

/**
 * Turns an unknown blob from a backup file into a LedgerState, or throws with a
 * message worth showing the user. Never trust a file you didn't just write.
 */
export function parseBackup(raw: string): LedgerState {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  if (!isRecord(data)) throw new Error("That file doesn't look like a Money Tracker backup.")
  if (data.version !== 1) throw new Error(`Unsupported backup version: ${String(data.version)}`)
  if (!Array.isArray(data.debts) || !Array.isArray(data.transactions)) {
    throw new Error('That backup is missing its debts or transactions.')
  }

  const debts = data.debts.map(parseDebt)
  const transactions = data.transactions.map(parseTransaction)

  // A payment pointing at a debt that no longer exists would silently corrupt
  // every derived number, so refuse the whole file rather than import half of it.
  const debtIds = new Set(debts.map((debt) => debt.id))
  for (const tx of transactions) {
    if ((tx.kind === 'payment' || tx.kind === 'adjustment') && !debtIds.has(tx.debtId)) {
      throw new Error('That backup has a payment pointing at a debt that is missing.')
    }
  }

  return { version: 1, debts, transactions }
}

export function serialiseBackup(state: LedgerState): string {
  return JSON.stringify(state, null, 2)
}

export function backupFilename(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `money-tracker-${now.getFullYear()}-${month}-${day}.json`
}
