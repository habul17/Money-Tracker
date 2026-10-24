'use client'

import { House, ListOrdered, Plus, Receipt, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { TransactionDialog } from '@/components/transaction-dialog'
import type { Transaction } from '@/core/types'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/', label: 'Home', icon: House },
  { href: '/debts', label: 'Debts', icon: ListOrdered },
  { href: '/log', label: 'Log', icon: Receipt },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const

interface TransactionDialogControls {
  openAdd: () => void
  openEdit: (transaction: Transaction) => void
}

const TransactionDialogContext = createContext<TransactionDialogControls | null>(null)

/** The add/edit entry dialog lives in the shell, so any screen can open it. */
export function useTransactionDialog(): TransactionDialogControls {
  const context = useContext(TransactionDialogContext)
  if (context === null) throw new Error('useTransactionDialog must be used inside the AppShell')
  return context
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const controls = useMemo<TransactionDialogControls>(
    () => ({
      openAdd() {
        setEditing(null)
        setDialogOpen(true)
      },
      openEdit(transaction) {
        setEditing(transaction)
        setDialogOpen(true)
      },
    }),
    [],
  )

  return (
    <TransactionDialogContext.Provider value={controls}>
      <div className="bg-background mx-auto flex min-h-dvh w-full max-w-md flex-col">
        <main className="flex-1 px-4 pt-4 pb-44">{children}</main>

        <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md">
          <div className="from-background pointer-events-none h-8 bg-gradient-to-t to-transparent" />
          <div className="bg-background border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={controls.openAdd}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus className="size-5" aria-hidden />
              Add
            </button>

            <nav className="grid grid-cols-4">
              {TABS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={pathname === href ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg py-1 text-[11px] font-medium transition-colors',
                    pathname === href ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
      </div>
    </TransactionDialogContext.Provider>
  )
}
