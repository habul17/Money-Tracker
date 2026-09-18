import { Download, TriangleAlert, Upload } from 'lucide-react'
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
import { backupFilename, serialiseBackup } from '@/core/backup'
import { useLedger } from '@/store/ledger-store'

export function SettingsScreen() {
  const { state, summary, importBackup, resetEverything } = useLedger()
  const fileInput = useRef<HTMLInputElement>(null)

  function handleExport() {
    const blob = new Blob([serialiseBackup(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = backupFilename()
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success('Backup saved. Put it somewhere that is not this phone.')
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

      <Card className="border-amber-600/30 bg-amber-600/5">
        <CardContent className="flex gap-3">
          <TriangleAlert className="size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Your data lives only on this device.</p>
            <p className="text-muted-foreground">
              Clearing your browser data, reinstalling it, or replacing this phone will erase
              everything. Export regularly and keep the file somewhere else.
            </p>
          </div>
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
            Deletes every debt and entry on this device. There is no undo.
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
