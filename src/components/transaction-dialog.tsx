import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { MoneyInput } from '@/components/money-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { todayIso } from '@/core/ledger'
import { formatPaise, paiseToInputValue, parseRupeesToPaise } from '@/core/money'
import type { Transaction } from '@/core/types'
import { useLedger } from '@/store/ledger-store'

type EditableKind = 'income' | 'expense' | 'payment'

const KIND_HELP: Record<EditableKind, string> = {
  income: 'Pocket money in. Your cash goes up, and what you still need goes down.',
  expense: 'Groceries, bills, anything spent. Your cash goes down, and what you still need goes up.',
  payment:
    "Money handed to a creditor. Cash and that debt both drop, so what you still need doesn't move.",
}

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pass a transaction to edit it; omit to record a new one. */
  editing?: Transaction | null
}

export function TransactionDialog({ open, onOpenChange, editing }: TransactionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Keyed and mounted only while open, so the form initialises its own
            state from props instead of resetting itself in an effect. */}
        {open && (
          <TransactionForm
            key={editing?.id ?? 'new'}
            editing={editing ?? null}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function TransactionForm({
  editing,
  onDone,
}: {
  editing: Transaction | null
  onDone: () => void
}) {
  const { summary, addTransaction, updateTransaction, deleteTransaction } = useLedger()

  const isEditing = editing !== null
  // Opening balances and balance fixes can be edited in place but can't change type.
  const lockedKind = isEditing && (editing.kind === 'opening' || editing.kind === 'adjustment')

  const [kind, setKind] = useState<EditableKind>(() =>
    editing !== null && editing.kind !== 'opening' && editing.kind !== 'adjustment'
      ? editing.kind
      : 'expense',
  )
  const [amount, setAmount] = useState(() =>
    editing !== null ? paiseToInputValue(Math.abs(editing.amount)) : '',
  )
  const [date, setDate] = useState(() => editing?.date ?? todayIso())
  const [note, setNote] = useState(() => editing?.note ?? '')
  const [debtId, setDebtId] = useState(() => {
    if (editing !== null) {
      return editing.kind === 'payment' || editing.kind === 'adjustment' ? editing.debtId : ''
    }
    return summary.payNext?.debt.id ?? ''
  })

  const payable = summary.activeDebts
  const selectedDebt = payable.find((view) => view.debt.id === debtId)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const paise = parseRupeesToPaise(amount)
    if (paise === null || paise <= 0) {
      toast.error('Enter an amount greater than zero.')
      return
    }
    if (kind === 'payment' && !lockedKind && debtId === '') {
      toast.error('Choose which debt this payment goes to.')
      return
    }

    if (isEditing) {
      // An adjustment's sign carries meaning (a fee versus a correction down),
      // so preserve its direction and only change the magnitude.
      const sign = editing.kind === 'adjustment' && editing.amount < 0 ? -1 : 1
      updateTransaction(editing.id, {
        amount: paise * sign,
        date,
        note: note.trim(),
        ...(editing.kind === 'payment' ? { debtId } : {}),
      } as Partial<Transaction>)
      toast.success('Entry updated.')
    } else {
      addTransaction({
        kind,
        amount: paise,
        date,
        note: note.trim(),
        ...(kind === 'payment' ? { debtId } : {}),
      })
      toast.success(
        kind === 'payment'
          ? `${formatPaise(paise)} off ${selectedDebt?.debt.name ?? 'your debt'}.`
          : 'Recorded.',
      )
    }
    onDone()
  }

  function handleDelete() {
    if (editing === null) return
    deleteTransaction(editing.id)
    toast.success('Entry deleted.')
    onDone()
  }

  const overpaying =
    kind === 'payment' &&
    selectedDebt !== undefined &&
    (parseRupeesToPaise(amount) ?? 0) > selectedDebt.remaining

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit entry' : 'Record something'}</DialogTitle>
        <DialogDescription>
          {lockedKind
            ? editing.kind === 'opening'
              ? 'Your starting pot.'
              : 'A hand-corrected debt balance.'
            : KIND_HELP[kind]}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        {!lockedKind && (
          <Tabs value={kind} onValueChange={(value) => setKind(value as EditableKind)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className="grid gap-2">
          <Label htmlFor="amount">Amount</Label>
          <MoneyInput id="amount" value={amount} onChange={setAmount} autoFocus={!isEditing} />
        </div>

        {kind === 'payment' && !lockedKind && (
          <div className="grid gap-2">
            <Label htmlFor="debt">Towards</Label>
            {payable.length === 0 ? (
              <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-sm">
                Nothing left to pay. Add a debt first.
              </p>
            ) : (
              <Select value={debtId} onValueChange={setDebtId}>
                <SelectTrigger id="debt" className="w-full">
                  <SelectValue placeholder="Choose a debt" />
                </SelectTrigger>
                <SelectContent>
                  {payable.map((view, index) => (
                    <SelectItem key={view.debt.id} value={view.debt.id}>
                      {index + 1}. {view.debt.name} — {formatPaise(view.remaining)} left
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {overpaying && selectedDebt !== undefined && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                That's more than the {formatPaise(selectedDebt.remaining)} outstanding. The debt will
                simply clear — it won't go negative.
              </p>
            )}
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="note">Note (optional)</Label>
          <Input
            id="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Groceries, rent, from dad…"
            autoComplete="off"
          />
        </div>
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        {isEditing ? (
          <Button type="button" variant="ghost" onClick={handleDelete} className="text-destructive">
            <Trash2 className="size-4" />
            Delete
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit">{isEditing ? 'Save' : 'Record'}</Button>
      </DialogFooter>
    </form>
  )
}
