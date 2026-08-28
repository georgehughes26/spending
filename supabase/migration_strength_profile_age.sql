-- Adds age to strength_profile, needed to look up age-adjusted strength
-- standards (see src/lib/strength/strengthStandards.js) -- bodyweight alone
-- isn't enough for a population comparison, published standards are split
-- by age too.
alter table strength_profile add column if not exists age integer;
