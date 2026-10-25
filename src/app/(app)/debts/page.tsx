import type { Metadata } from 'next'
import { DebtsScreen } from '@/screens/debts-screen'

export const metadata: Metadata = { title: 'Debts' }

export default function DebtsPage() {
  return <DebtsScreen />
}
