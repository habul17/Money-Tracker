# Debt Tracker

A personal, mobile-first debt tracker for someone **not currently earning** — living off a pot of
savings while paying down several debts. It answers one question every time you open it:

> How much more money do I need to be free?

It is a **tracker, not a planner.** It tells you where you stand today. It makes no forecasts, knows
nothing about interest rates or due dates, and will never tell you a payoff date.

## The money model

Three things you record, and only three:

| | Cash | The debt | Shortfall |
|---|---|---|---|
| **Income** — pocket money, gifts | ↑ up | — | ↓ **down** |
| **Expense** — groceries, bills | ↓ down | — | ↑ **up** |
| **Payment** — money to a creditor | ↓ down | ↓ down | **unchanged** |

```
cash       = opening balance + income − expenses − payments
total debt = sum of what is still owed
shortfall  = total debt − cash          ← "how much more money I need"
```

Buying groceries does not increase what you owe anyone. It widens the gap between what you owe and
what you have. That gap is the headline number.

**A payment is not an expense.** Both take money out of your pocket, but an expense leaves you worse
off while a payment converts cash into progress — which is why the shortfall doesn't flinch when you
pay a creditor.

## The log is the only stored truth

Cash, total debt, shortfall and every progress bar are **derived from the transaction log on each
render**. None of them are stored. They therefore cannot drift out of sync with your records: fix a
typo in the log and every number on every screen corrects itself.

The two bookkeeping entry types the app writes for you:

- `opening` — your starting pot, the first entry in the log.
- `adjustment` — a hand-corrected debt balance (a creditor's fee, a drift). Moves the debt, never
  the cash. Written instead of overwriting history, so corrections stay traceable.

## Debts

Each debt has a **name**, an **original amount** and a derived **current balance**. Debts live in a
list you drag into your own priority order — top means pay next. Nothing recalculates when you
rearrange it; the order reflects real-world obligation, not arithmetic.

- A debt reaching zero moves to **Cleared** and still counts toward your overall progress.
- **Archiving** takes a debt out of the picture entirely, excluded from all totals, with its payment
  history left intact in the log.
- A debt with payments recorded against it can be archived but **never deleted** — deleting it would
  silently rewrite your cash history.

## Storage and backup

Everything lives in `localStorage` on the device. There is no server and no account, so:

- **Clearing browser data, reinstalling the browser or replacing the phone erases everything.**
- Settings → Export writes the whole ledger to a JSON file. Keep it somewhere that is not the phone.
- Phone and desktop do not sync. The phone is the source of truth.

## Running it

```bash
bun install
bun dev            # http://localhost:5173
bun run build      # static output in dist/
bun run lint
```

On your phone: open the dev or deployed URL, then **Add to Home Screen**. It installs as a
standalone app via `public/manifest.webmanifest`.

## Layout

```
src/
  core/            framework-free domain logic — no React, moves to React Native untouched
    money.ts       integer paise, ₹ lakh-grouped formatting, parsing
    types.ts       Debt, Transaction, LedgerState
    ledger.ts      every derivation: cash, balances, shortfall, progress, priority
    backup.ts      export / import with validation
  store/
    ledger-store.tsx   React context, actions, localStorage persistence
  screens/         home, debts, log, settings
  components/      dialogs, shared rows, shadcn/ui primitives
```

**All amounts are integer paise, never floats.** `0.1 + 0.2 !== 0.3` in JavaScript, and in a money
app that error compounds through every derived number until the totals are visibly wrong.

## Stack

React 19 · TypeScript · Vite · Tailwind v4 · shadcn/ui · dnd-kit · bun

## Deliberately not here

Interest rates · due dates · reminders · payoff projections · snowball/avalanche sorting ·
spending categories · multi-currency · device sync · automatic backup.
