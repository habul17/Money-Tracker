-- One ledger per account. The whole LedgerState is stored as one JSON document
-- because the app already treats it as a single unit: every number is derived
-- from it on each render, and backups are the same shape.
--
-- `version` goes up by one on every save. A save names the version it started
-- from, so a phone and a laptop editing at once can't silently overwrite each other.
create table if not exists ledger (
  user_id    text primary key references "user" (id) on delete cascade,
  data       jsonb not null,
  version    integer not null default 0,
  updated_at timestamptz not null default now()
);
