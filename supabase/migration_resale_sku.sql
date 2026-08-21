-- Run this once in the Supabase SQL Editor.
-- Adds an optional SKU field to resale stock items.

alter table resale_items add column if not exists sku text;
