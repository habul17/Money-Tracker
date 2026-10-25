'use client'

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

/** Browser bar colours, matching --background in globals.css and the tags in the root layout. */
const THEME_COLORS = { light: '#ffffff', dark: '#0a0a0a' } as const

/**
 * Light, dark, or whatever the device uses. The choice is a per-device preference, so
 * it lives under its own key and stays out of the ledger and its backups.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" storageKey="money-tracker:theme" disableTransitionOnChange>
      <ThemeColorSync />
      {children}
    </NextThemesProvider>
  )
}

/**
 * The theme-color tags in the root layout follow the device setting. After a manual pick of
 * Light or Dark, point them at that instead, so the phone's status bar matches the app.
 */
function ThemeColorSync() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (resolvedTheme !== 'light' && resolvedTheme !== 'dark') return
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute('content', THEME_COLORS[resolvedTheme])
    }
  }, [resolvedTheme])

  return null
}
