/**
 * All amounts in this app are integer paise. Never floats.
 * 0.1 + 0.2 !== 0.3 in JavaScript, and in a money app that error
 * compounds through every derived number until the totals are visibly wrong.
 */
export type Paise = number

const rupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const preciseFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** "₹1,00,000" — Indian lakh grouping, paise hidden unless they exist. */
export function formatPaise(paise: Paise): string {
  const rounded = Math.round(paise)
  if (rounded % 100 === 0) return rupeeFormatter.format(rounded / 100)
  return preciseFormatter.format(rounded / 100)
}

/** "1,00,000" — same grouping, no symbol. For tight spaces. */
export function formatPaiseBare(paise: Paise): string {
  return formatPaise(paise).replace(/^₹\s?/, '')
}

/**
 * Parse what a human typed into integer paise, without ever touching a float.
 * Accepts "1,234.5", "₹1234", " 1234.56 ". Returns null if it isn't a number.
 */
export function parseRupeesToPaise(input: string): Paise | null {
  const cleaned = input.replace(/[₹,\s]/g, '')
  if (cleaned === '') return null
  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(cleaned)
  if (!match) return null
  const [, whole = '', fraction = ''] = match
  if (whole === '' && fraction === '') return null
  const paddedFraction = fraction.padEnd(2, '0')
  return Number(whole || '0') * 100 + Number(paddedFraction || '0')
}

/** Paise back to an editable rupee string, e.g. 123456 -> "1234.56", 100000 -> "1000" */
export function paiseToInputValue(paise: Paise): string {
  const whole = Math.trunc(paise / 100)
  const fraction = Math.abs(paise % 100)
  return fraction === 0 ? String(whole) : `${whole}.${String(fraction).padStart(2, '0')}`
}
