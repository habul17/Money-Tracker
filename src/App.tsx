import { House, ListOrdered, Plus, Receipt, Settings } from 'lucide-react'
import { useState } from 'react'
import { TransactionDialog } from '@/components/transaction-dialog'
import { Toaster } from '@/components/ui/sonner'
import type { Transaction } from '@/core/types'
import { DebtsScreen } from '@/screens/debts-screen'
import { HomeScreen } from '@/screens/home-screen'
import { LogScreen } from '@/screens/log-screen'
import { SettingsScreen } from '@/screens/settings-screen'
import { cn } from '@/lib/utils'
import { LedgerProvider } from '@/store/ledger-store'

type Tab = 'home' | 'debts' | 'log' | 'settings'

const TABS = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'debts', label: 'Debts', icon: ListOrdered },
  { id: 'log', label: 'Log', icon: Receipt },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const satisfies readonly { id: Tab; label: string; icon: typeof House }[]

export default function App() {
  return (
    <LedgerProvider>
      <Shell />
      <Toaster position="top-center" />
    </LedgerProvider>
  )
}

function Shell() {
  const [tab, setTab] = useState<Tab>('home')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(transaction: Transaction) {
    setEditing(transaction)
    setDialogOpen(true)
  }

  return (
    <div className="bg-background mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 px-4 pt-4 pb-44">
        {tab === 'home' && (
          <HomeScreen
            onGoToDebts={() => setTab('debts')}
            onGoToLog={() => setTab('log')}
            onEditTransaction={openEdit}
          />
        )}
        {tab === 'debts' && <DebtsScreen />}
        {tab === 'log' && <LogScreen onEditTransaction={openEdit} />}
        {tab === 'settings' && <SettingsScreen />}
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md">
        <div className="from-background pointer-events-none h-8 bg-gradient-to-t to-transparent" />
        <div className="bg-background border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={openAdd}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="size-5" aria-hidden />
            Add
          </button>

          <nav className="grid grid-cols-4">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={tab === id ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg py-1 text-[11px] font-medium transition-colors',
                  tab === id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}
