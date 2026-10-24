import type { Metadata } from 'next'
import { LogScreen } from '@/screens/log-screen'

export const metadata: Metadata = { title: 'Log' }

export default function LogPage() {
  return <LogScreen />
}
