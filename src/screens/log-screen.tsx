import { useMemo, useState } from 'react'
import { TransactionRow } from '@/components/transaction-row'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { sortTransactions, todayIso } from '@/core/ledger'
import type { Transaction, TransactionKind } from '@/core/types'
import { useLedger } from '@/store/ledger-store'

type Filter = 'all' | 'income' | 'expense' | 'payment'

const FILTER_KINDS: Record<Filter, TransactionKind[] | null> = {
  all: null,
  income: ['income', 'opening'],
  expense: ['expense'],
  payment: ['payment', 'adjustment'],
}

function formatDateHeading(iso: string): string {
  if (iso === todayIso()) return 'Today'
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function LogScreen({
  onEditTransaction,
}: {
  onEditTransaction: (transaction: Transaction) => void
}) {
  const { state } = useLedger()
  const [filter, setFilter] = useState<Filter>('all')

  const debtNames = useMemo(
    () => new Map(state.debts.map((debt) => [debt.id, debt.name])),
    [state.debts],
  )

  const groups = useMemo(() => {
    const kinds = FILTER_KINDS[filter]
    const filtered = sortTransactions(state.transactions).filter(
      (tx) => kinds === null || kinds.includes(tx.kind),
    )
    const byDate = new Map<string, Transaction[]>()
    for (const tx of filtered) {
      const bucket = byDate.get(tx.date)
      if (bucket === undefined) byDate.set(tx.date, [tx])
      else bucket.push(tx)
    }
    return [...byDate.entries()]
  }, [state.transactions, filter])

  return (
    <div className="space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Log</h1>
        <p className="text-muted-foreground text-sm">
          Every number in this app is worked out from these entries. Tap one to fix it.
        </p>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="income">In</TabsTrigger>
          <TabsTrigger value="expense">Out</TabsTrigger>
          <TabsTrigger value="payment">Paid</TabsTrigger>
        </TabsList>
      </Tabs>

      {groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-muted-foreground text-center text-sm">
            Nothing recorded here yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map(([date, transactions]) => (
            <section key={date}>
              <h2 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                {formatDateHeading(date)}
              </h2>
              <div className="divide-border divide-y">
                {transactions.map((transaction) => (
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
          ))}
        </div>
      )}
    </div>
  )
}
