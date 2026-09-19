import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { parseBackup } from '@/core/backup'
import { deriveRemaining, deriveSummary, hasHistory, todayIso } from '@/core/ledger'
import type { LedgerSummary } from '@/core/ledger'
import type { Paise } from '@/core/money'
import { EMPTY_LEDGER } from '@/core/types'
import type { Debt, DebtId, LedgerState, Transaction, TransactionId } from '@/core/types'

const STORAGE_KEY = 'money-tracker:v1'

function loadState(): LedgerState {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    // Private mode or blocked storage. Nothing to recover.
    return EMPTY_LEDGER
  }
  if (raw === null) return EMPTY_LEDGER

  try {
    return parseBackup(raw)
  } catch {
    // Starting empty is survivable; silently destroying the ledger is not.
    // The app persists its state on mount, so an empty start would overwrite
    // whatever is here within milliseconds. Copy it aside first.
    try {
      window.localStorage.setItem(`${STORAGE_KEY}:unreadable`, raw)
    } catch {
      // Out of space or blocked. The original survives until the next write.
    }
    return EMPTY_LEDGER
  }
}

function newId(): string {
  return crypto.randomUUID()
}

export interface NewTransactionInput {
  kind: 'income' | 'expense' | 'payment' | 'opening'
  amount: Paise
  date: string
  note?: string
  debtId?: DebtId
}

interface LedgerContextValue {
  state: LedgerState
  summary: LedgerSummary
  addTransaction: (input: NewTransactionInput) => void
  updateTransaction: (id: TransactionId, patch: Partial<Omit<Transaction, 'id' | 'kind'>>) => void
  deleteTransaction: (id: TransactionId) => void
  addDebt: (name: string, originalAmount: Paise) => void
  updateDebt: (id: DebtId, patch: { name?: string; originalAmount?: Paise }) => void
  /** Hand-corrects a balance by writing a visible adjustment entry, never by overwriting history. */
  setDebtBalance: (id: DebtId, remaining: Paise, note?: string) => void
  reorderDebts: (activeId: DebtId, overId: DebtId) => void
  archiveDebt: (id: DebtId) => void
  restoreDebt: (id: DebtId) => void
  deleteDebt: (id: DebtId) => void
  canDeleteDebt: (id: DebtId) => boolean
  importBackup: (raw: string) => void
  resetEverything: () => void
}

const LedgerContext = createContext<LedgerContextValue | null>(null)

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LedgerState>(loadState)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage full or blocked. The in-memory ledger still works for this
      // session; the export button is the escape hatch.
    }
  }, [state])

  const summary = useMemo(() => deriveSummary(state), [state])

  const addTransaction = useCallback((input: NewTransactionInput) => {
    setState((current) => {
      const base = {
        id: newId(),
        amount: input.amount,
        date: input.date,
        createdAt: new Date().toISOString(),
        ...(input.note !== undefined && input.note !== '' ? { note: input.note } : {}),
      }
      const tx: Transaction =
        input.kind === 'payment'
          ? { ...base, kind: 'payment', debtId: input.debtId as DebtId }
          : { ...base, kind: input.kind }
      return { ...current, transactions: [...current.transactions, tx] }
    })
  }, [])

  const updateTransaction = useCallback<LedgerContextValue['updateTransaction']>((id, patch) => {
    setState((current) => ({
      ...current,
      transactions: current.transactions.map((tx) =>
        tx.id === id ? ({ ...tx, ...patch } as Transaction) : tx,
      ),
    }))
  }, [])

  const deleteTransaction = useCallback((id: TransactionId) => {
    setState((current) => ({
      ...current,
      transactions: current.transactions.filter((tx) => tx.id !== id),
    }))
  }, [])

  const addDebt = useCallback((name: string, originalAmount: Paise) => {
    const debt: Debt = { id: newId(), name, originalAmount }
    setState((current) => ({ ...current, debts: [...current.debts, debt] }))
  }, [])

  const updateDebt = useCallback<LedgerContextValue['updateDebt']>((id, patch) => {
    setState((current) => ({
      ...current,
      debts: current.debts.map((debt) => (debt.id === id ? { ...debt, ...patch } : debt)),
    }))
  }, [])

  const setDebtBalance = useCallback<LedgerContextValue['setDebtBalance']>((id, remaining, note) => {
    setState((current) => {
      const debt = current.debts.find((candidate) => candidate.id === id)
      if (debt === undefined) return current
      const delta = remaining - deriveRemaining(debt, current.transactions)
      if (delta === 0) return current
      const adjustment: Transaction = {
        id: newId(),
        kind: 'adjustment',
        amount: delta,
        debtId: id,
        date: todayIso(),
        createdAt: new Date().toISOString(),
        ...(note !== undefined && note !== '' ? { note } : {}),
      }
      return { ...current, transactions: [...current.transactions, adjustment] }
    })
  }, [])

  const reorderDebts = useCallback((activeId: DebtId, overId: DebtId) => {
    setState((current) => {
      const from = current.debts.findIndex((debt) => debt.id === activeId)
      const to = current.debts.findIndex((debt) => debt.id === overId)
      if (from === -1 || to === -1 || from === to) return current
      const debts = [...current.debts]
      const [moved] = debts.splice(from, 1)
      debts.splice(to, 0, moved)
      return { ...current, debts }
    })
  }, [])

  const archiveDebt = useCallback((id: DebtId) => {
    setState((current) => ({
      ...current,
      debts: current.debts.map((debt) =>
        debt.id === id ? { ...debt, archivedAt: new Date().toISOString() } : debt,
      ),
    }))
  }, [])

  const restoreDebt = useCallback((id: DebtId) => {
    setState((current) => ({
      ...current,
      debts: current.debts.map((debt) => {
        if (debt.id !== id) return debt
        const { archivedAt: _archivedAt, ...rest } = debt
        return rest
      }),
    }))
  }, [])

  const deleteDebt = useCallback((id: DebtId) => {
    setState((current) => {
      // Deleting a debt with payments against it would silently rewrite your
      // cash history. Archive is the only way out for those.
      if (hasHistory(id, current.transactions)) return current
      return { ...current, debts: current.debts.filter((debt) => debt.id !== id) }
    })
  }, [])

  const canDeleteDebt = useCallback(
    (id: DebtId) => !hasHistory(id, state.transactions),
    [state.transactions],
  )

  const importBackup = useCallback((raw: string) => {
    setState(parseBackup(raw))
  }, [])

  const resetEverything = useCallback(() => {
    setState(EMPTY_LEDGER)
  }, [])

  const value = useMemo<LedgerContextValue>(
    () => ({
      state,
      summary,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addDebt,
      updateDebt,
      setDebtBalance,
      reorderDebts,
      archiveDebt,
      restoreDebt,
      deleteDebt,
      canDeleteDebt,
      importBackup,
      resetEverything,
    }),
    [
      state,
      summary,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addDebt,
      updateDebt,
      setDebtBalance,
      reorderDebts,
      archiveDebt,
      restoreDebt,
      deleteDebt,
      canDeleteDebt,
      importBackup,
      resetEverything,
    ],
  )

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
}

export function useLedger(): LedgerContextValue {
  const context = useContext(LedgerContext)
  if (context === null) throw new Error('useLedger must be used inside a LedgerProvider')
  return context
}
