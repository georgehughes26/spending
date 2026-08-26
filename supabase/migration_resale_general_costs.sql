-- Run this once in the Supabase SQL Editor.
-- General resale-business costs that aren't tied to a specific item (tape,
-- packaging, a Vinted subscription, etc.) -- separate from per-item costs,
-- which are being retired from the UI in favour of this.

create table if not exists resale_general_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  label text not null,
  amount numeric not null default 0,
  cost_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists resale_general_costs_user_id_idx on resale_general_costs(user_id);

alter table resale_general_costs enable row level security;

drop policy if exists "anon full access" on resale_general_costs;
create policy "anon full access" on resale_general_costs
  for all
  to anon
  using (true)
  with check (true);
