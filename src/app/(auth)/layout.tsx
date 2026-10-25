import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getSession } from '@/server/auth'

export default async function AuthLayout({ children }: { children: ReactNode }) {
  // Already signed in: the login page has nothing to offer.
  if ((await getSession()) !== null) redirect('/')

  return (
    <main className="bg-background mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      {children}
    </main>
  )
}
