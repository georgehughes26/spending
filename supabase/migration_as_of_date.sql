-- Run this once in the Supabase SQL Editor.
-- Adds a field for "figures are accurate up to this date" so you can enter a
-- month's data incrementally (e.g. do the 1st-10th now, 11th onwards later)
-- and see exactly where you left off.

alter table monthly_entries
  add column if not exists as_of_date date;

-- Backfill existing rows to the last day of their month, so old entries
-- read as "fully up to date" rather than blank.
update monthly_entries
set as_of_date = (date_trunc('month', month) + interval '1 month' - interval '1 day')::date
where as_of_date is null;
