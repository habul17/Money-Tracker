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

## Accounts and storage

You log in with an email and password (Better Auth). Each account has exactly one ledger, stored in
Postgres (Neon) as a single JSON document in the `ledger` table, keyed by user id. The same login
shows the same ledger on every device.

- The server reads the ledger before sending a page, so the app opens with your data already there.
- Every change is saved about half a second after you stop editing. The user id comes from the
  session cookie, never from the browser, so an account can only read and write its own ledger.
- Each save names the version it started from. If another tab or device saved first, the save is
  refused and the newer ledger replaces what is on screen, rather than one silently overwriting
  the other.
- Settings → Export still writes the whole ledger to a JSON file, and Restore reads one back.

The light/dark choice in Settings → Appearance is a per-device preference. It is stored under its
own key (`money-tracker:theme`), so backups don't include it.

## Running it

```bash
bun install
bun run db:migrate # create or update the tables in Neon (safe to re-run)
bun dev            # http://localhost:5173
bun run build      # production build in .next/
bun start          # serve that build on http://localhost:5173
bun run lint
```

It needs a `.env.local` (git-ignored) with:

```bash
DATABASE_URL="postgresql://…"     # Neon → Connect, pooled, with sslmode=verify-full
BETTER_AUTH_SECRET="…"            # openssl rand -base64 32
BETTER_AUTH_URL="http://localhost:5173"
```

The port is pinned because `BETTER_AUTH_URL` names it. If 5173 is taken, the command fails rather
than moving.

On your phone: open the dev or deployed URL, then **Add to Home Screen**. It installs as a
standalone app via `public/manifest.webmanifest`.

## Layout

```
src/
  app/
    (app)/         the four tabs; its layout checks the session and loads the ledger
    (auth)/        /login and /signup
    api/auth/      Better Auth's endpoints
  core/            framework-free domain logic — no React, moves to React Native untouched
    money.ts       integer paise, ₹ lakh-grouped formatting, parsing
    types.ts       Debt, Transaction, LedgerState
    ledger.ts      every derivation: cash, balances, shortfall, progress, priority
    backup.ts      export / import with validation
  store/
    ledger-store.tsx   React context, actions, saving to the server
  server/          runs only on the server
    db.ts          the Postgres pool
    auth.ts        Better Auth config and getSession()
    ledger.ts      load and save one account's ledger
    ledger-actions.ts  the save action the browser calls
db/ledger.sql      the ledger table (auth tables come from Better Auth)
scripts/migrate.ts creates both
  screens/         home, debts, log, settings
  components/      app shell (bottom nav, add dialog), dialogs, shared rows, shadcn/ui primitives
```

**All amounts are integer paise, never floats.** `0.1 + 0.2 !== 0.3` in JavaScript, and in a money
app that error compounds through every derived number until the totals are visibly wrong.

## Stack

React 19 · TypeScript · Next.js 16 (App Router) · Tailwind v4 · shadcn/ui · dnd-kit · Better Auth ·
Postgres (Neon) · bun

## Deliberately not here

Interest rates · due dates · reminders · payoff projections · snowball/avalanche sorting ·
spending categories · multi-currency · automatic backup.
