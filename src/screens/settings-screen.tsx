'use client'

import { Download, LogOut, Monitor, Moon, Sun, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useRef } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { backupFilename, serialiseBackup } from '@/core/backup'
import { authClient } from '@/lib/auth-client'
import { useLedger } from '@/store/ledger-store'

export function SettingsScreen() {
  const { state, summary, importBackup, resetEverything } = useLedger()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const fileInput = useRef<HTMLInputElement>(null)

  function handleExport() {
    const blob = new Blob([serialiseBackup(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = backupFilename()
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success('Backup saved.')
  }

  async function handleSignOut() {
    await authClient.signOut()
    router.replace('/login')
    router.refresh()
  }

  async function handleImportFile(file: File) {
    try {
      importBackup(await file.text())
      toast.success('Backup restored.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'That file could not be read.')
    } finally {
      if (fileInput.current !== null) fileInput.current.value = ''
    }
  }

  return (
    <div className="space-y-5">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>
            {session?.user.email ?? '…'}. Everything is saved to this account, so it is the
            same on every device you log in on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignOut} variant="outline" className="w-full justify-start">
            <LogOut className="size-4" />
            Log out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backup</CardTitle>
          <CardDescription>
            {state.transactions.length} entries across {state.debts.length} debts.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button onClick={handleExport} variant="outline" className="w-full justify-start">
            <Download className="size-4" />
            Export to a file
          </Button>
          <Button
            onClick={() => fileInput.current?.click()}
            variant="outline"
            className="w-full justify-start"
          >
            <Upload className="size-4" />
            Restore from a file
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file !== undefined) void handleImportFile(file)
            }}
          />
          <p className="text-muted-foreground text-xs">
            Restoring replaces everything currently in the app.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>System matches your phone or computer.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={theme ?? 'system'} onValueChange={setTheme}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="system">
                <Monitor aria-hidden />
                System
              </TabsTrigger>
              <TabsTrigger value="light">
                <Sun aria-hidden />
                Light
              </TabsTrigger>
              <TabsTrigger value="dark">
                <Moon aria-hidden />
                Dark
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How the numbers work</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            <strong className="text-foreground">Income</strong> raises your cash, so what you still
            need drops.
          </p>
          <p>
            <strong className="text-foreground">Expenses</strong> lower your cash, so what you still
            need rises. Buying groceries doesn't increase what you owe anyone — it widens the gap.
          </p>
          <p>
            <strong className="text-foreground">Payments</strong> lower your cash and the debt
            together, so what you still need doesn't move. You've converted money into progress.
          </p>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base">Start over</CardTitle>
          <CardDescription>
            Deletes every debt and entry in this account. There is no undo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                Erase everything
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Erase everything?</AlertDialogTitle>
                <AlertDialogDescription>
                  This wipes {state.transactions.length} entries and {state.debts.length} debts,
                  including {formatSummaryLine(summary.percentPaid)}. Export first if you might want
                  any of it back.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    resetEverything()
                    toast.success('Everything erased.')
                  }}
                >
                  Erase
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}

function formatSummaryLine(percentPaid: number): string {
  return `${Math.floor(percentPaid)}% of progress`
}
