-- Run this once in the Supabase SQL Editor.
-- Adds weekly spending entry. Each row is one calendar week (Mon-Sun),
-- clipped to the month it falls in (so the first/last week of a month may
-- be shorter than 7 days). Income, account balances, house contributions,
-- and notes stay monthly (see monthly_entries) — only spending is weekly.
--
-- Spending totals are synced into monthly_entries.spending automatically by
-- the app whenever a week is saved, so the Dashboard keeps working unchanged.

create table if not exists weekly_spending (
  id uuid primary key default gen_random_uuid(),
  month date not null,       -- first of the month this week belongs to
  week_start date not null,  -- first day of this bucket (>= month start)
  week_end date not null,    -- last day of this bucket (<= month end)
  spending jsonb not null default '{}'::jsonb, -- { "Food": 40, "Transport": 12, ... }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, week_start)
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists weekly_spending_set_updated_at on weekly_spending;
create trigger weekly_spending_set_updated_at
  before update on weekly_spending
  for each row execute function set_updated_at();

alter table weekly_spending enable row level security;

drop policy if exists "anon full access" on weekly_spending;
create policy "anon full access" on weekly_spending
  for all
  to anon
  using (true)
  with check (true);

-- The "figures accurate up to" date field has been replaced by weekly entry
-- (you can see exactly which weeks are filled in instead). Safe to drop —
-- uncomment if you want to clean it up:
-- alter table monthly_entries drop column if exists as_of_date;
