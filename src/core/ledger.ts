import type { Paise } from './money'
import type { Debt, DebtId, LedgerState, Transaction } from './types'

export interface DebtView {
  debt: Debt
  /** What is still owed. Clamped at zero — an overpayment does not create a negative debt. */
  remaining: Paise
  /** originalAmount - remaining, so a cleared debt reads as fully paid. */
  paid: Paise
  percentPaid: number
  isCleared: boolean
}

export interface LedgerSummary {
  /** opening + income - expenses - payments. May go negative: that means you overdrew. */
  cash: Paise
  /** Sum of what is still owed across active debts. */
  totalDebt: Paise
  /**
   * totalDebt - cash. The headline: how much more money you need.
   * Negative means your cash already covers everything you owe.
   */
  shortfall: Paise
  totalOriginal: Paise
  totalPaid: Paise
  /** 0-100. The only number here that moves in just one direction. */
  percentPaid: number
  /** In your chosen priority order, still owing. */
  activeDebts: DebtView[]
  clearedDebts: DebtView[]
  archivedDebts: DebtView[]
  /** Top of your priority list, or null when nothing is left. */
  payNext: DebtView | null
}

/** Cash never touches a debt balance, and adjustments never touch cash. */
export function deriveCash(transactions: Transaction[]): Paise {
  return transactions.reduce((cash, tx) => {
    switch (tx.kind) {
      case 'opening':
      case 'income':
        return cash + tx.amount
      case 'expense':
      case 'payment':
        return cash - tx.amount
      case 'adjustment':
        return cash
    }
  }, 0)
}

export function deriveRemaining(debt: Debt, transactions: Transaction[]): Paise {
  const movement = transactions.reduce((total, tx) => {
    if (tx.kind === 'payment' && tx.debtId === debt.id) return total - tx.amount
    if (tx.kind === 'adjustment' && tx.debtId === debt.id) return total + tx.amount
    return total
  }, 0)
  return Math.max(0, debt.originalAmount + movement)
}

function toView(debt: Debt, transactions: Transaction[]): DebtView {
  const remaining = deriveRemaining(debt, transactions)
  const paid = debt.originalAmount - remaining
  return {
    debt,
    remaining,
    paid,
    percentPaid: debt.originalAmount === 0 ? 100 : (paid / debt.originalAmount) * 100,
    isCleared: remaining === 0,
  }
}

export function deriveSummary(state: LedgerState): LedgerSummary {
  const { debts, transactions } = state
  const views = debts.map((debt) => toView(debt, transactions))

  const archivedDebts = views.filter((view) => view.debt.archivedAt !== undefined)
  const live = views.filter((view) => view.debt.archivedAt === undefined)
  const activeDebts = live.filter((view) => !view.isCleared)
  const clearedDebts = live.filter((view) => view.isCleared)

  const cash = deriveCash(transactions)
  const totalDebt = activeDebts.reduce((sum, view) => sum + view.remaining, 0)

  // Progress counts cleared debts — watching that grow is the point of the bar.
  // Archived debts are excluded entirely; you took them out of the picture.
  const totalOriginal = live.reduce((sum, view) => sum + view.debt.originalAmount, 0)
  const totalPaid = live.reduce((sum, view) => sum + view.paid, 0)

  return {
    cash,
    totalDebt,
    shortfall: totalDebt - cash,
    totalOriginal,
    totalPaid,
    percentPaid: totalOriginal === 0 ? 0 : (totalPaid / totalOriginal) * 100,
    activeDebts,
    clearedDebts,
    archivedDebts,
    payNext: activeDebts[0] ?? null,
  }
}

/** Newest first. createdAt breaks ties within a single day. */
export function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return a.createdAt < b.createdAt ? 1 : -1
  })
}

/** A debt with money already recorded against it can be archived, but never deleted. */
export function hasHistory(debtId: DebtId, transactions: Transaction[]): boolean {
  return transactions.some(
    (tx) => (tx.kind === 'payment' || tx.kind === 'adjustment') && tx.debtId === debtId,
  )
}

export function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
