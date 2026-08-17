-- Run this once in the Supabase SQL Editor.
--
-- 1) Theme preference (pink/dark) per account.
-- 2) resale_access gates the Reselling tab -- it's per-account, off by
--    default. After running this, flip it on for your own account only:
--      update users set resale_access = true where lower(name) = lower('yourname');
-- 3) The Reselling stock-tracking tables.

alter table users add column if not exists theme text not null default 'pink' check (theme in ('pink', 'dark'));
alter table users add column if not exists resale_access boolean not null default false;

create table if not exists resale_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  category text,
  platform text,
  status text not null default 'purchased' check (status in ('purchased', 'arrived', 'listed', 'sold')),
  payment_status text check (payment_status in ('awaiting_payment', 'paid')),
  cost_price numeric not null default 0,
  target_price numeric,
  sold_price numeric,
  purchased_date date not null default current_date,
  listed_date date,
  sold_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resale_items_user_id_idx on resale_items(user_id);

create table if not exists resale_item_costs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references resale_items(id) on delete cascade,
  label text not null,
  amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists resale_item_costs_item_id_idx on resale_item_costs(item_id);

-- set_updated_at() already exists from migration_fixed_costs.sql
drop trigger if exists resale_items_set_updated_at on resale_items;
create trigger resale_items_set_updated_at
  before update on resale_items
  for each row execute function set_updated_at();

alter table resale_items enable row level security;
alter table resale_item_costs enable row level security;

drop policy if exists "anon full access" on resale_items;
create policy "anon full access" on resale_items
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "anon full access" on resale_item_costs;
create policy "anon full access" on resale_item_costs
  for all
  to anon
  using (true)
  with check (true);
