-- Run this once in the Supabase SQL Editor.
-- Lets a monthly entry's weekly-spending buckets run payday-to-payday
-- instead of always spanning the calendar month. The entry keeps being
-- labelled by its `month` field (e.g. "August") regardless of what dates
-- period_start/period_end actually cover.

alter table monthly_entries add column if not exists period_start date;
alter table monthly_entries add column if not exists period_end date;
