'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { parseBackup } from '@/core/backup'
import { deriveRemaining, deriveSummary, hasHistory, todayIso } from '@/core/ledger'
import type { LedgerSummary } from '@/core/ledger'
import type { Paise } from '@/core/money'
import { EMPTY_LEDGER } from '@/core/types'
import type { Debt, DebtId, LedgerState, Transaction, TransactionId } from '@/core/types'
import type { StoredLedger } from '@/server/ledger'
import { saveMyLedger } from '@/server/ledger-actions'

/** Waits for a burst of edits (dragging a debt, typing a fix) to settle before saving. */
const SAVE_DELAY_MS = 600
const RETRY_DELAY_MS = 5000

// Where the ledger lived before accounts existed. Starting fresh was the choice
// when moving to the database, so whatever is left there is cleared once.
const OLD_STORAGE_KEYS = ['money-tracker:v1', 'money-tracker:v1:unreadable']

function clearOldDeviceStorage() {
  try {
    for (const key of OLD_STORAGE_KEYS) window.localStorage.removeItem(key)
  } catch {
    // Blocked storage has nothing in it to clear.
  }
}

function newId(): string {
  // randomUUID only exists on HTTPS or localhost. A phone opening the dev server over
  // Wi-Fi (plain http://192.168.x.x) gets random hex instead; ids are opaque either way.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

/**
 * Keeps the database in step with the ledger on screen. One save runs at a time and
 * names the version it started from. If another tab or device saved in between, the
 * server refuses and hands back its ledger, which replaces what is on screen.
 */
function createSaver(initial: StoredLedger, replaceState: (state: LedgerState) => void) {
  let latest = initial.state
  /** What the server holds at `version`. */
  let saved = initial.state
  let version = initial.version
  let inFlight = false
  let timer: ReturnType<typeof setTimeout> | undefined

  function schedule(delay: number) {
    clearTimeout(timer)
    timer = setTimeout(() => void flush(), delay)
  }

  async function flush() {
    // A change made mid-save is picked up by the check at the bottom.
    if (inFlight || latest === saved) return
    const sending = latest
    inFlight = true
    let failed = false
    try {
      const result = await saveMyLedger(sending, version)
      if (result.ok) {
        saved = sending
        version = result.version
      } else {
        saved = latest = result.latest.state
        version = result.latest.version
        replaceState(result.latest.state)
        toast.info('This was changed on another device. Showing the latest.')
      }
    } catch {
      failed = true
      toast.error("Couldn't save. Trying again in a few seconds.", { id: 'save-failed' })
    } finally {
      inFlight = false
    }
    if (latest !== saved) schedule(failed ? RETRY_DELAY_MS : SAVE_DELAY_MS)
  }

  return {
    update(next: LedgerState) {
      latest = next
      if (latest !== saved) schedule(SAVE_DELAY_MS)
    },
    hasUnsaved: () => latest !== saved,
  }
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

export function LedgerProvider({
  initial,
  children,
}: {
  /** Read from the database by the server before the page is sent. */
  initial: StoredLedger
  children: ReactNode
}) {
  const [state, setState] = useState<LedgerState>(initial.state)
  const [saver] = useState(() => createSaver(initial, setState))

  useEffect(() => {
    saver.update(state)
  }, [saver, state])

  useEffect(() => {
    // Closing the tab mid-save would drop the last change, so ask first.
    function warnIfUnsaved(event: BeforeUnloadEvent) {
      if (saver.hasUnsaved()) event.preventDefault()
    }
    window.addEventListener('beforeunload', warnIfUnsaved)
    return () => window.removeEventListener('beforeunload', warnIfUnsaved)
  }, [saver])

  useEffect(clearOldDeviceStorage, [])

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
