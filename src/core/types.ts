import type { Paise } from './money'

export type DebtId = string
export type TransactionId = string

/** An ISO date, "2026-09-16". Dates here are calendar days, not instants. */
export type IsoDate = string

export interface Debt {
  id: DebtId
  name: string
  /** What you owed when you first recorded this debt. Never moves on its own. */
  originalAmount: Paise
  /** Set when you deliberately take a debt out of the picture. Its history stays in the log. */
  archivedAt?: string
}

/**
 * The three things you record, plus two bookkeeping entries the app writes for you.
 *
 *   opening    — your starting pot, the first entry in the log
 *   income     — pocket money in. Cash up, shortfall down.
 *   expense    — groceries, bills. Cash down, shortfall up.
 *   payment    — money to a creditor. Cash down AND that debt down. Shortfall unchanged.
 *   adjustment — a hand-corrected debt balance (a fee, an error). Debt moves, cash does not.
 */
export type TransactionKind = 'opening' | 'income' | 'expense' | 'payment' | 'adjustment'

interface TransactionBase {
  id: TransactionId
  date: IsoDate
  note?: string
  /** Wall-clock instant the entry was created. Used only to break ties when sorting. */
  createdAt: string
}

export interface OpeningTransaction extends TransactionBase {
  kind: 'opening'
  amount: Paise
}

export interface IncomeTransaction extends TransactionBase {
  kind: 'income'
  amount: Paise
}

export interface ExpenseTransaction extends TransactionBase {
  kind: 'expense'
  amount: Paise
}

export interface PaymentTransaction extends TransactionBase {
  kind: 'payment'
  amount: Paise
  debtId: DebtId
}

export interface AdjustmentTransaction extends TransactionBase {
  kind: 'adjustment'
  /** Signed. Positive means the debt grew (a fee); negative means it shrank. */
  amount: Paise
  debtId: DebtId
}

export type Transaction =
  | OpeningTransaction
  | IncomeTransaction
  | ExpenseTransaction
  | PaymentTransaction
  | AdjustmentTransaction

/**
 * Everything that is actually stored. Note what is absent: no cash balance,
 * no current debt balances, no totals. Those are all derived from this on
 * every render, so they can never drift out of sync with the log.
 *
 * `debts` is ordered. The order IS your payoff priority — index 0 is next.
 */
export interface LedgerState {
  version: 1
  debts: Debt[]
  transactions: Transaction[]
}

export const EMPTY_LEDGER: LedgerState = {
  version: 1,
  debts: [],
  transactions: [],
}
