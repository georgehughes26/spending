-- Run this once in the Supabase SQL Editor.
-- Mileage and hours-worked logs for the reselling business. Recorded only
-- for now -- not yet counted in any totals, profit, or tax figures.
--
-- reason/activity are plain text rather than a check constraint, so adding
-- a new dropdown option later only needs a code change (src/utils/resaleLogs.js).

create table if not exists resale_mileage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  trip_date date not null default current_date,
  reason text not null,
  miles numeric not null check (miles >= 0),
  created_at timestamptz not null default now()
);

create index if not exists resale_mileage_user_id_idx on resale_mileage(user_id);

alter table resale_mileage enable row level security;

drop policy if exists "anon full access" on resale_mileage;
create policy "anon full access" on resale_mileage
  for all
  to anon
  using (true)
  with check (true);

create table if not exists resale_hours (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  work_date date not null default current_date,
  activity text not null,
  hours numeric not null check (hours >= 0),
  created_at timestamptz not null default now()
);

create index if not exists resale_hours_user_id_idx on resale_hours(user_id);

alter table resale_hours enable row level security;

drop policy if exists "anon full access" on resale_hours;
create policy "anon full access" on resale_hours
  for all
  to anon
  using (true)
  with check (true);
