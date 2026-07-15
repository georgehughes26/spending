-- Run this once in the Supabase SQL Editor, after schema.sql.
-- Adds tables for the GoCardless Bank Account Data (Open Banking) sync.

-- Singleton row caching the GoCardless API access/refresh token so Edge
-- Functions don't request a new token on every call (GoCardless rate-limits
-- token creation). Only ever has one row (id = 1).
create table if not exists gc_tokens (
  id int primary key default 1,
  access_token text,
  access_expires_at timestamptz,
  refresh_token text,
  refresh_expires_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint gc_tokens_singleton check (id = 1)
);

-- One row per bank connection attempt (a "requisition" in GoCardless terms).
create table if not exists bank_connections (
  id uuid primary key default gen_random_uuid(),
  institution_id text not null,
  institution_name text not null,
  reference text not null unique,     -- our reference, echoed back as ?ref= on the OAuth redirect
  requisition_id text not null unique, -- GoCardless's requisition id, used for API calls
  status text not null default 'pending', -- pending | linked | expired | error
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per bank account returned once a connection is linked.
create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references bank_connections(id) on delete cascade,
  gc_account_id text not null unique, -- GoCardless account id
  iban text,
  display_name text,
  currency text,
  created_at timestamptz not null default now()
);

-- Raw transactions pulled from GoCardless, categorized on insert using
-- category_rules (falls back to 'Other' if nothing matches).
create table if not exists bank_transactions (
  id uuid primary key default gen_random_uuid(),
  bank_account_id uuid not null references bank_accounts(id) on delete cascade,
  gc_transaction_id text not null unique,
  booked_date date not null,
  amount numeric not null, -- negative = money out, positive = money in
  currency text not null,
  description text not null default '',
  category text, -- one of SPENDING_CATEGORIES, or null if income/unmatched
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Keyword -> category mapping used to auto-categorize transactions.
-- match_text is matched case-insensitively against the transaction description.
create table if not exists category_rules (
  id uuid primary key default gen_random_uuid(),
  match_text text not null,
  category text not null,
  created_at timestamptz not null default now()
);

insert into category_rules (match_text, category) values
  ('tesco', 'Food'),
  ('sainsbury', 'Food'),
  ('asda', 'Food'),
  ('aldi', 'Food'),
  ('lidl', 'Food'),
  ('uber eats', 'Food'),
  ('deliveroo', 'Food'),
  ('just eat', 'Food'),
  ('wetherspoon', 'Drinking'),
  ('pub', 'Drinking'),
  ('bar ', 'Drinking'),
  ('amazon', 'Shopping'),
  ('asos', 'Shopping'),
  ('netflix', 'Entertainment'),
  ('spotify', 'Entertainment'),
  ('cinema', 'Entertainment'),
  ('uber', 'Transport'),
  ('trainline', 'Transport'),
  ('tfl', 'Transport'),
  ('pharmacy', 'Health'),
  ('boots', 'Health'),
  ('gym', 'Health'),
  ('rent', 'Fixed Monthly Costs'),
  ('mortgage', 'Fixed Monthly Costs'),
  ('council tax', 'Fixed Monthly Costs'),
  ('direct debit', 'Fixed Monthly Costs')
on conflict do nothing;

alter table gc_tokens enable row level security;
alter table bank_connections enable row level security;
alter table bank_accounts enable row level security;
alter table bank_transactions enable row level security;
alter table category_rules enable row level security;

-- Same personal-tool caveat as schema.sql: anon key gets full access.
-- gc_tokens additionally should ONLY ever be touched by Edge Functions
-- (which use the service_role key and bypass RLS) — no anon policy is
-- created for it, so the frontend cannot read/write API tokens directly.
drop policy if exists "anon full access" on bank_connections;
create policy "anon full access" on bank_connections for all to anon using (true) with check (true);

drop policy if exists "anon full access" on bank_accounts;
create policy "anon full access" on bank_accounts for all to anon using (true) with check (true);

drop policy if exists "anon full access" on bank_transactions;
create policy "anon full access" on bank_transactions for all to anon using (true) with check (true);

drop policy if exists "anon full access" on category_rules;
create policy "anon full access" on category_rules for all to anon using (true) with check (true);
