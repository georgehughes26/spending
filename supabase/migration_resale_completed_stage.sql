-- Run this once in the Supabase SQL Editor.
--
-- Reselling goes back to 4 real stages: Purchased, Listed, Sold, Completed.
-- "Completed" is no longer just a UI-derived paid+shipped view -- it's a
-- real status you move a card into, and sold_date now means "completed
-- date" (set when a card lands in Completed), not "the day it was marked
-- Sold". The status check constraint needs to allow the new value.

alter table resale_items drop constraint if exists resale_items_status_check;
alter table resale_items add constraint resale_items_status_check
  check (status in ('purchased', 'arrived', 'listed', 'sold', 'completed'));
