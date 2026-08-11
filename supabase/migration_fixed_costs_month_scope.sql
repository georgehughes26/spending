-- Run this once in the Supabase SQL Editor.
-- Fixed costs become month-scoped: each one applies from start_month onward
-- (and stops at end_month if set), instead of a single global total applied
-- to every month regardless of when it was added or removed.
--
-- Existing rows get start_month far in the past so they keep applying to
-- every month like before -- only newly added costs are scoped to "from now".

alter table fixed_costs add column if not exists start_month date not null default '2000-01-01';
alter table fixed_costs add column if not exists end_month date;
