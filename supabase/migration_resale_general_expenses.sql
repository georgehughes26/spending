-- Run this once in the Supabase SQL Editor.
-- Splits the reselling page's general costs into two categories that share
-- one table:
--   'cost'    -- Direct Costs: costs of selling not tied to one item
--                (namesets, mailing bags). Taken off sales for Gross Profit.
--   'expense' -- Overheads: running costs of the business
--                (subscriptions, web domain, ads). Taken off Gross Profit
--                for Net Profit.
-- Every existing row starts as a Direct Cost; move individual entries to
-- Overheads from the page (Edit -> Move to Overheads).

alter table resale_general_costs
  add column if not exists kind text not null default 'cost'
  check (kind in ('cost', 'expense'));
