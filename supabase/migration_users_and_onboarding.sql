-- Run this once in the Supabase SQL Editor.
-- Adds simple name+PIN accounts (no real password auth — see caveat below),
-- per-user savings pots and spending categories, and wipes the existing
-- single-user data so both of you can go through onboarding fresh.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin_hash text not null, -- SHA-256 of "name:pin", hashed client-side (see src/lib/auth.js)
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists users_name_lower_idx on users (lower(name));

-- Per-user savings pots (replaces the old static GOALS_CONFIG).
create table if not exists savings_pots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  percentage numeric not null default 0, -- 0-1, should sum to 1 across a user's pots
  starting_balance numeric not null default 0,
  target numeric, -- optional
  target_date date, -- optional
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-user spending categories (replaces the old static SPENDING_CATEGORIES).
create table if not exists spending_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Wipe existing single-user data, then scope the remaining tables to users.
truncate table monthly_entries, weekly_spending, fixed_costs;

alter table monthly_entries add column if not exists user_id uuid references users(id) on delete cascade;
alter table weekly_spending add column if not exists user_id uuid references users(id) on delete cascade;
alter table fixed_costs add column if not exists user_id uuid references users(id) on delete cascade;

-- Each month/week is now unique per-user, not globally.
alter table monthly_entries drop constraint if exists monthly_entries_month_key;
create unique index if not exists monthly_entries_user_month_idx on monthly_entries (user_id, month);

alter table weekly_spending drop constraint if exists weekly_spending_month_week_start_key;
create unique index if not exists weekly_spending_user_month_week_idx on weekly_spending (user_id, month, week_start);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists savings_pots_set_updated_at on savings_pots;
create trigger savings_pots_set_updated_at
  before update on savings_pots
  for each row execute function set_updated_at();

alter table users enable row level security;
alter table savings_pots enable row level security;
alter table spending_categories enable row level security;

-- Same personal-tool caveat as the other schema files: there's no real
-- Supabase Auth here, just a name+PIN check done client-side against the
-- `users` table using the shared anon key. Anyone with your project URL and
-- anon key can still read/write any user's data directly — the PIN stops
-- casual access through the app's UI, not a determined attacker with API
-- access. Fine for two trusted people on a private app; add real Supabase
-- Auth + per-row RLS policies before this goes anywhere more exposed.
drop policy if exists "anon full access" on users;
create policy "anon full access" on users for all to anon using (true) with check (true);

drop policy if exists "anon full access" on savings_pots;
create policy "anon full access" on savings_pots for all to anon using (true) with check (true);

drop policy if exists "anon full access" on spending_categories;
create policy "anon full access" on spending_categories for all to anon using (true) with check (true);
