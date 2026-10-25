'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

type Mode = 'login' | 'signup'

const COPY = {
  login: {
    title: 'Log in',
    description: 'Welcome back.',
    submit: 'Log in',
    switchPrompt: 'New here?',
    switchLink: 'Create an account',
    switchHref: '/signup',
  },
  signup: {
    title: 'Create an account',
    description: 'Your debts and entries are saved to it, on every device you sign in on.',
    submit: 'Create account',
    switchPrompt: 'Already have an account?',
    switchLink: 'Log in',
    switchHref: '/login',
  },
} as const

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const copy = COPY[mode]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email'))
    const password = String(form.get('password'))

    setPending(true)
    setError(null)
    const { error } =
      mode === 'signup'
        ? await authClient.signUp.email({ name: String(form.get('name')), email, password })
        : await authClient.signIn.email({ email, password })

    if (error) {
      setError(error.message ?? 'Something went wrong. Try again.')
      setPending(false)
      return
    }
    // The session cookie is set now; refresh so the server sees it and sends the app.
    router.replace('/')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {mode === 'signup' && (
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" autoComplete="name" required />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={8}
              required
            />
            {mode === 'signup' && (
              <p className="text-muted-foreground text-xs">At least 8 characters.</p>
            )}
          </div>

          {error !== null && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="h-11 w-full">
            {pending ? 'Please wait…' : copy.submit}
          </Button>
        </form>

        <p className="text-muted-foreground mt-6 text-center text-sm">
          {copy.switchPrompt}{' '}
          <Link
            href={copy.switchHref}
            className="text-foreground font-medium underline underline-offset-4"
          >
            {copy.switchLink}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
