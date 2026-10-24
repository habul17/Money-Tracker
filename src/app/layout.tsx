import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'
import { Toaster } from '@/components/ui/sonner'
import { LedgerProvider } from '@/store/ledger-store'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Debt Tracker', template: '%s · Debt Tracker' },
  description: 'How much more money do I need to be free?',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
    apple: '/app-icon.svg',
  },
  appleWebApp: { capable: true, title: 'Debt', statusBarStyle: 'default' },
  // Next only emits the standard mobile-web-app-capable tag; older iOS still reads this one.
  other: { 'apple-mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LedgerProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="top-center" />
        </LedgerProvider>
      </body>
    </html>
  )
}
