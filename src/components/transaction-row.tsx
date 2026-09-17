import { ArrowDownLeft, ArrowUpRight, PencilLine, Sprout, Wallet } from 'lucide-react'
import { formatPaise } from '@/core/money'
import type { Transaction } from '@/core/types'
import { cn } from '@/lib/utils'

const PRESENTATION = {
  opening: { icon: Sprout, label: 'Opening balance', tone: 'text-muted-foreground', sign: '+' },
  income: { icon: ArrowDownLeft, label: 'Income', tone: 'text-emerald-600 dark:text-emerald-400', sign: '+' },
  expense: { icon: ArrowUpRight, label: 'Expense', tone: 'text-rose-600 dark:text-rose-400', sign: '−' },
  payment: { icon: Wallet, label: 'Payment', tone: 'text-foreground', sign: '' },
  adjustment: { icon: PencilLine, label: 'Balance fix', tone: 'text-amber-600 dark:text-amber-400', sign: '' },
} as const

export function transactionTitle(tx: Transaction, debtName?: string): string {
  if (tx.kind === 'payment') return debtName ?? 'Payment'
  if (tx.kind === 'adjustment') return `${debtName ?? 'Debt'} balance fixed`
  return tx.note ?? PRESENTATION[tx.kind].label
}

interface TransactionRowProps {
  transaction: Transaction
  debtName?: string
  onClick?: () => void
}

export function TransactionRow({ transaction, debtName, onClick }: TransactionRowProps) {
  const presentation = PRESENTATION[transaction.kind]
  const Icon = presentation.icon
  const title = transactionTitle(transaction, debtName)
  const subtitle =
    transaction.kind === 'payment' || transaction.kind === 'adjustment'
      ? (transaction.note ?? presentation.label)
      : transaction.note !== undefined
        ? presentation.label
        : undefined

  const signedAmount =
    transaction.kind === 'adjustment'
      ? `${transaction.amount > 0 ? '+' : '−'}${formatPaise(Math.abs(transaction.amount))}`
      : `${presentation.sign}${formatPaise(transaction.amount)}`

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={onClick === undefined}
      className={cn(
        'flex w-full items-center gap-3 py-3 text-left transition-colors',
        onClick !== undefined && 'hover:bg-muted/60 -mx-2 rounded-lg px-2',
      )}
    >
      <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
        <Icon className={cn('size-4', presentation.tone)} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {subtitle !== undefined && (
          <span className="text-muted-foreground block truncate text-xs">{subtitle}</span>
        )}
      </span>
      <span className={cn('shrink-0 text-sm font-semibold tabular-nums', presentation.tone)}>
        {signedAmount}
      </span>
    </button>
  )
}
