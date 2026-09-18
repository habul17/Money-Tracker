import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, GripVertical, Plus } from 'lucide-react'
import { useState } from 'react'
import { DebtDialog } from '@/components/debt-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { DebtView } from '@/core/ledger'
import { formatPaise } from '@/core/money'
import { cn } from '@/lib/utils'
import { useLedger } from '@/store/ledger-store'

export function DebtsScreen() {
  const { summary, reorderDebts } = useLedger()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<DebtView | null>(null)

  const sensors = useSensors(
    // A short hold before dragging starts, otherwise every attempt to scroll
    // the list on a phone picks a debt up instead.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over === null || active.id === over.id) return
    reorderDebts(String(active.id), String(over.id))
  }

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(view: DebtView) {
    setEditing(view)
    setDialogOpen(true)
  }

  const isEmpty =
    summary.activeDebts.length === 0 &&
    summary.clearedDebts.length === 0 &&
    summary.archivedDebts.length === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your debts</h1>
          <p className="text-muted-foreground text-sm">Top of the list is what you pay next.</p>
        </div>
        <Button size="icon" variant="outline" onClick={openAdd} aria-label="Add a debt">
          <Plus className="size-4" />
        </Button>
      </div>

      {isEmpty && (
        <Card className="border-dashed">
          <CardContent className="space-y-3 text-center">
            <p className="text-sm font-medium">No debts yet.</p>
            <p className="text-muted-foreground text-sm">
              Add each one you owe. You'll be able to drag them into the order you want to clear
              them.
            </p>
            <Button onClick={openAdd} className="w-full">
              <Plus className="size-4" />
              Add your first debt
            </Button>
          </CardContent>
        </Card>
      )}

      {summary.activeDebts.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={summary.activeDebts.map((view) => view.debt.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {summary.activeDebts.map((view, index) => (
                <SortableDebtRow
                  key={view.debt.id}
                  view={view}
                  position={index + 1}
                  onEdit={() => openEdit(view)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {summary.clearedDebts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Cleared
          </h2>
          <ul className="space-y-2">
            {summary.clearedDebts.map((view) => (
              <li key={view.debt.id}>
                <button
                  type="button"
                  onClick={() => openEdit(view)}
                  className="bg-card hover:bg-muted/50 flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-600/15">
                    <Check className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium line-through opacity-70">
                    {view.debt.name}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {formatPaise(view.debt.originalAmount)} paid
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.archivedDebts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Archived
          </h2>
          <ul className="space-y-2">
            {summary.archivedDebts.map((view) => (
              <li key={view.debt.id}>
                <button
                  type="button"
                  onClick={() => openEdit(view)}
                  className="bg-card hover:bg-muted/50 flex w-full items-center gap-3 rounded-xl border border-dashed px-3 py-3 text-left opacity-60 transition-colors"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {view.debt.name}
                  </span>
                  <Badge variant="secondary">out of the picture</Badge>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DebtDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}

function SortableDebtRow({
  view,
  position,
  onEdit,
}: {
  view: DebtView
  position: number
  onEdit: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: view.debt.id,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('touch-manipulation', isDragging && 'z-10')}
    >
      <div
        className={cn(
          'bg-card flex items-center gap-1 rounded-xl border transition-shadow',
          isDragging && 'shadow-lg',
        )}
      >
        {/* Listeners live on the handle only, so the list still scrolls normally. */}
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex h-full shrink-0 cursor-grab touch-none items-center self-stretch px-2 active:cursor-grabbing"
          aria-label={`Reorder ${view.debt.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-5" aria-hidden />
        </button>

        <button type="button" onClick={onEdit} className="min-w-0 flex-1 space-y-2 py-3 pr-3 text-left">
          <span className="flex items-baseline gap-2">
            <span className="text-muted-foreground text-xs font-semibold tabular-nums">
              {position}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{view.debt.name}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {formatPaise(view.remaining)}
            </span>
          </span>
          <Progress value={view.percentPaid} className="h-1.5" />
          <span className="text-muted-foreground block text-xs tabular-nums">
            {formatPaise(view.paid)} paid of {formatPaise(view.debt.originalAmount)}
          </span>
        </button>
      </div>

    </li>
  )
}
