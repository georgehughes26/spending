-- Run this once in the Supabase SQL Editor.
-- Fixed monthly costs (rent, subscriptions, council tax, etc.) are tracked as
-- a single recurring list rather than re-entered weekly/monthly — the same
-- total applies to every month until you add, amend, or delete an item here.

create table if not exists fixed_costs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists fixed_costs_set_updated_at on fixed_costs;
create trigger fixed_costs_set_updated_at
  before update on fixed_costs
  for each row execute function set_updated_at();

alter table fixed_costs enable row level security;

drop policy if exists "anon full access" on fixed_costs;
create policy "anon full access" on fixed_costs
  for all
  to anon
  using (true)
  with check (true);
