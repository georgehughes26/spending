-- Run this once in the Supabase SQL Editor.
-- Adds shipping-courier tracking to resale stock items:
-- shipping_in is the courier the item arrived with (set on purchase),
-- shipping_out is the courier used to post it to the buyer (set on sale),
-- shipping_status mirrors payment_status so you can see what's still to post.

alter table resale_items add column if not exists shipping_in text check (shipping_in in ('Evri', 'InPost', 'Royal Mail'));
alter table resale_items add column if not exists shipping_out text check (shipping_out in ('Evri', 'InPost', 'Royal Mail'));
alter table resale_items add column if not exists shipping_status text check (shipping_status in ('not_shipped', 'shipped'));
