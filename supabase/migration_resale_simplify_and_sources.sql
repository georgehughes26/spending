-- Run this once in the Supabase SQL Editor.
--
-- Reselling pipeline simplifies from Purchased/Arrived/Listed/Sold/Completed
-- down to Purchased/Listed/Sold -- "Arrived" is retired (any item there
-- gets folded into Purchased by the app, not by this migration) and
-- "Completed" was always just a UI-derived view of a sold item that's also
-- paid+shipped, not a real status, so nothing to migrate for it. The
-- payment_status/shipping_status columns and "Mark paid"/"Mark shipped"
-- actions are untouched -- that per-card detail stays, only the board's
-- column count drops.
--
-- Also adds where an item was bought from / sold on, and where a general
-- cost was bought from.

alter table resale_items add column if not exists bought_from text check (bought_from in ('Vinted', 'eBay', 'Other'));
alter table resale_items add column if not exists sold_on text check (sold_on in ('Vinted', 'eBay', 'Website', 'Other'));
alter table resale_general_costs add column if not exists bought_from text;
