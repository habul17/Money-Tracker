import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface MoneyInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

/**
 * A rupee field. inputMode="decimal" is what gets the numeric keypad on a phone,
 * which is most of the reason logging an expense at the counter takes eight seconds.
 */
export function MoneyInput({
  id,
  value,
  onChange,
  placeholder = '0',
  autoFocus,
  className,
}: MoneyInputProps) {
  return (
    <div className={cn('relative', className)}>
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-lg">
        ₹
      </span>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode="decimal"
        autoComplete="off"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        className="h-14 pl-8 text-2xl font-semibold tabular-nums md:text-2xl"
      />
    </div>
  )
}
