-- Run this once in the Supabase SQL Editor.
-- Lets each savings pot be tracked one of two ways:
--
--   'contributions' (default) — the pot's value is starting_balance + every
--   actual contribution you've logged. Correct for cash pots, where a pound
--   in is always a pound there.
--
--   'balance' — you enter the pot's real closing balance each month instead
--   (pulled from whatever platform holds it). Correct for anything invested,
--   where the value moves independently of what you put in. Contributions
--   are still recorded for these pots but are informational only — they
--   don't drive the pot's total.
--
-- Closing balances for 'balance' pots are stored in the existing
-- monthly_entries.account_balances jsonb column, keyed by pot id (that
-- column previously held generic LISA/Cash/Investments/Pension balances for
-- the old Net Worth card — this repurposes it per-pot instead).

alter table savings_pots
  add column if not exists tracking_mode text not null default 'contributions'
  check (tracking_mode in ('contributions', 'balance'));
