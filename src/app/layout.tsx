import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
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
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The theme script adds the dark class to <html> before React loads, which React
    // would otherwise report as a mismatch with the server's HTML.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Browser bar colours for each device setting. They sit here rather than in
            `viewport` because Next rewrites those tags on every page change, which would
            undo ThemeProvider pointing them at a manual Light or Dark choice. */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0a" />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
