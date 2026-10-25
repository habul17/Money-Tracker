import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'
import { getSession } from '@/server/auth'
import { loadLedger } from '@/server/ledger'
import { LedgerProvider } from '@/store/ledger-store'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (session === null) redirect('/login')

  return (
    <LedgerProvider initial={await loadLedger(session.user.id)}>
      <AppShell>{children}</AppShell>
    </LedgerProvider>
  )
}
