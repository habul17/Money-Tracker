import { ChevronRight, PartyPopper } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { MoneyInput } from '@/components/money-input'
import { TransactionRow } from '@/components/transaction-row'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { sortTransactions, todayIso } from '@/core/ledger'
import { formatPaise, parseRupeesToPaise } from '@/core/money'
import type { Transaction } from '@/core/types'
import { cn } from '@/lib/utils'
import { useLedger } from '@/store/ledger-store'

interface HomeScreenProps {
  onGoToDebts: () => void
  onGoToLog: () => void
  onEditTransaction: (transaction: Transaction) => void
}

export function HomeScreen({ onGoToDebts, onGoToLog, onEditTransaction }: HomeScreenProps) {
  const { state, summary } = useLedger()
  const debtNames = new Map(state.debts.map((debt) => [debt.id, debt.name]))
  const recent = sortTransactions(state.transactions).slice(0, 5)

  if (state.transactions.length === 0 && state.debts.length === 0) {
    return <FirstRun onGoToDebts={onGoToDebts} />
  }

  const isClear = summary.shortfall <= 0

  return (
    <div className="space-y-6">
      <section className="pt-2 text-center">
        <p className="text-muted-foreground text-sm font-medium">
          {isClear ? "You're clear" : 'You still need'}
        </p>
        <p
          className={cn(
            'mt-1 text-5xl font-bold tracking-tight tabular-nums',
            isClear && 'text-emerald-600 dark:text-emerald-400',
          )}
        >
          {formatPaise(Math.abs(summary.shortfall))}
        </p>
        {isClear && summary.shortfall < 0 && (
          <p className="text-muted-foreground mt-1 text-sm">spare, after everything you owe</p>
        )}
      </section>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground text-sm">Total debt</span>
            <span className="font-semibold tabular-nums">{formatPaise(summary.totalDebt)}</span>
          </div>
          <Separator />
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground text-sm">You have</span>
            <span
              className={cn(
                'font-semibold tabular-nums',
                summary.cash < 0 && 'text-rose-600 dark:text-rose-400',
              )}
            >
              {formatPaise(summary.cash)}
            </span>
          </div>
          {summary.cash < 0 && (
            <p className="text-rose-600 text-xs dark:text-rose-400">
              You've spent more than you had. This is borrowed money.
            </p>
          )}
        </CardContent>
      </Card>

      {summary.totalOriginal > 0 && (
        <Card>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">
                {Math.floor(summary.percentPaid)}% paid off
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {formatPaise(summary.totalPaid)} of {formatPaise(summary.totalOriginal)}
              </span>
            </div>
            <Progress value={summary.percentPaid} className="h-2.5" />
            <p className="text-muted-foreground text-xs">
              The one number here that only ever moves forward.
            </p>
          </CardContent>
        </Card>
      )}

      {summary.payNext !== null ? (
        <Card>
          <CardContent>
            <button
              type="button"
              onClick={onGoToDebts}
              className="flex w-full items-center gap-3 text-left"
            >
              <span className="min-w-0 flex-1 space-y-2">
                <span className="text-muted-foreground block text-xs font-semibold tracking-wide uppercase">
                  Pay next
                </span>
                <span className="block truncate text-lg font-semibold">
                  {summary.payNext.debt.name}
                </span>
                <Progress value={summary.payNext.percentPaid} className="h-1.5" />
                <span className="text-muted-foreground block text-xs tabular-nums">
                  {formatPaise(summary.payNext.remaining)} left of{' '}
                  {formatPaise(summary.payNext.debt.originalAmount)}
                </span>
              </span>
              <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden />
            </button>
          </CardContent>
        </Card>
      ) : (
        state.debts.length > 0 && (
          <Card className="border-emerald-600/30 bg-emerald-600/5">
            <CardContent className="flex items-center gap-3">
              <PartyPopper className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <p className="text-sm font-medium">
                Every debt is cleared. There is nothing left to pay.
              </p>
            </CardContent>
          </Card>
        )
      )}

      {recent.length > 0 && (
        <section>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Recent
            </h2>
            <Button variant="ghost" size="sm" onClick={onGoToLog} className="h-7 text-xs">
              See all
            </Button>
          </div>
          <div className="divide-border divide-y">
            {recent.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                debtName={
                  transaction.kind === 'payment' || transaction.kind === 'adjustment'
                    ? debtNames.get(transaction.debtId)
                    : undefined
                }
                onClick={() => onEditTransaction(transaction)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/**
 * The very first screen. Two things are needed before any number means anything:
 * what you have, and what you owe.
 */
function FirstRun({ onGoToDebts }: { onGoToDebts: () => void }) {
  const { addTransaction } = useLedger()
  const [pot, setPot] = useState('')

  function handleSave() {
    const paise = parseRupeesToPaise(pot)
    if (paise === null || paise < 0) {
      toast.error('Enter the amount you have right now.')
      return
    }
    addTransaction({
      kind: 'opening',
      amount: paise,
      date: todayIso(),
      note: 'Starting pot',
    })
    toast.success('Saved. Now add what you owe.')
    onGoToDebts()
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Let's start with what you have.</h1>
        <p className="text-muted-foreground text-sm">
          Everything else in this app is worked out from your entries, so the opening number
          matters. How much money is in your pot right now?
        </p>
      </div>

      <MoneyInput value={pot} onChange={setPot} autoFocus />

      <Button onClick={handleSave} className="w-full" size="lg">
        Continue
      </Button>

      <p className="text-muted-foreground text-xs">
        Next you'll add your debts and drag them into the order you want to clear them.
      </p>
    </div>
  )
}
