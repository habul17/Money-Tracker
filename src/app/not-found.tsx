import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="space-y-3 pt-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Nothing here.</h1>
      <p className="text-muted-foreground text-sm">This page doesn't exist.</p>
      <Link href="/" className="inline-block text-sm font-medium underline underline-offset-4">
        Back to home
      </Link>
    </div>
  )
}
