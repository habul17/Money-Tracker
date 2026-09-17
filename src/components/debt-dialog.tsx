import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import type { DebtView } from '@/core/ledger'
import { paiseToInputValue, parseRupeesToPaise } from '@/core/money'
import { useLedger } from '@/store/ledger-store'

interface DebtDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pass a debt view to edit it; omit to add a new debt. */
  editing?: DebtView | null
}

export function DebtDialog({ open, onOpenChange, editing }: DebtDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <DebtForm
            key={editing?.debt.id ?? 'new'}
            editing={editing ?? null}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function DebtForm({ editing, onDone }: { editing: DebtView | null; onDone: () => void }) {
  const { addDebt, updateDebt, setDebtBalance, archiveDebt, restoreDebt, deleteDebt, canDeleteDebt } =
    useLedger()

  const isEditing = editing !== null
  const isArchived = isEditing && editing.debt.archivedAt !== undefined
  const deletable = isEditing && canDeleteDebt(editing.debt.id)

  const [name, setName] = useState(() => editing?.debt.name ?? '')
  const [original, setOriginal] = useState(() =>
    editing !== null ? paiseToInputValue(editing.debt.originalAmount) : '',
  )
  const [remaining, setRemaining] = useState(() =>
    editing !== null ? paiseToInputValue(editing.remaining) : '',
  )

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (trimmedName === '') {
      toast.error('Give the debt a name.')
      return
    }
    const originalPaise = parseRupeesToPaise(original)
    if (originalPaise === null || originalPaise <= 0) {
      toast.error('Enter what you originally owed.')
      return
    }

    if (editing !== null) {
      updateDebt(editing.debt.id, { name: trimmedName, originalAmount: originalPaise })
      const remainingPaise = parseRupeesToPaise(remaining)
      if (remainingPaise !== null && remainingPaise !== editing.remaining) {
        // Written as a visible adjustment entry rather than an overwrite, so the
        // log stays the single source of truth for every derived number.
        setDebtBalance(editing.debt.id, remainingPaise, 'Balance corrected by hand')
      }
      toast.success('Debt updated.')
    } else {
      addDebt(trimmedName, originalPaise)
      toast.success(`${trimmedName} added.`)
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit debt' : 'Add a debt'}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? 'Correcting the balance writes a visible entry in your log, so your numbers stay traceable.'
            : 'What you owe, and to whom. You can drag it into your payoff order afterwards.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="debt-name">Name</Label>
          <Input
            id="debt-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bank loan, credit card, cousin…"
            autoComplete="off"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="debt-original">Originally owed</Label>
          <MoneyInput id="debt-original" value={original} onChange={setOriginal} />
          <p className="text-muted-foreground text-xs">
            This is what the progress bar measures against. It never moves on its own.
          </p>
        </div>

        {isEditing && (
          <>
            <Separator />
            <div className="grid gap-2">
              <Label htmlFor="debt-remaining">Still owed today</Label>
              <MoneyInput id="debt-remaining" value={remaining} onChange={setRemaining} />
              <p className="text-muted-foreground text-xs">
                Normally this falls by itself as you record payments. Change it only when a creditor
                adds a fee or something drifted out of sync.
              </p>
            </div>
          </>
        )}
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        <div className="flex gap-1">
          {isEditing && isArchived && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                restoreDebt(editing.debt.id)
                toast.success('Debt restored.')
                onDone()
              }}
            >
              <ArchiveRestore className="size-4" />
              Restore
            </Button>
          )}
          {isEditing && !isArchived && !deletable && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                archiveDebt(editing.debt.id)
                toast.success('Debt archived. Its payments stay in your log.')
                onDone()
              }}
            >
              <Archive className="size-4" />
              Archive
            </Button>
          )}
          {isEditing && deletable && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                deleteDebt(editing.debt.id)
                toast.success('Debt deleted.')
                onDone()
              }}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          )}
        </div>
        <Button type="submit">{isEditing ? 'Save' : 'Add debt'}</Button>
      </DialogFooter>
    </form>
  )
}
