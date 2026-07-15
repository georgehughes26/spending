-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- Creates the single table the app reads/writes, one row per month.

create table if not exists monthly_entries (
  id uuid primary key default gen_random_uuid(),
  month date not null unique, -- always stored as the 1st of the month, e.g. 2026-07-01
  income numeric not null default 0,
  spending jsonb not null default '{}'::jsonb,          -- { "Housing": 500, "Food/Groceries": 300, ... }
  account_balances jsonb not null default '{}'::jsonb,  -- { "LISA": 10500, "Cash": 2000, ... }
  goal_contributions jsonb not null default '{}'::jsonb,-- { "lisa": 400, "holiday": 200, ... }
  house_contribution_me numeric not null default 0,
  house_contribution_partner numeric not null default 0,
  as_of_date date, -- figures are accurate up to this date (for partial-month entries)
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at current on every edit.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists monthly_entries_set_updated_at on monthly_entries;
create trigger monthly_entries_set_updated_at
  before update on monthly_entries
  for each row execute function set_updated_at();

-- Row Level Security: this app has no login system yet, so it connects with the
-- public "anon" key. The policies below allow that key full read/write access.
-- This means anyone with your project URL + anon key can read/write this table.
-- Fine for a private personal tool; add Supabase Auth + tighter policies before
-- sharing the URL/key with anyone else or deploying somewhere public.
alter table monthly_entries enable row level security;

drop policy if exists "anon full access" on monthly_entries;
create policy "anon full access" on monthly_entries
  for all
  to anon
  using (true)
  with check (true);
