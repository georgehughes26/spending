-- Switches exercises from a single target_reps number to a real rep range
-- (e.g. 6-8, 10-12) -- matches actual double-progression training: work
-- through the range at a given weight, add weight once you hit the top of
-- the range on every set.

alter table strength_program_exercises add column if not exists target_reps_min integer;
alter table strength_program_exercises add column if not exists target_reps_max integer;

-- Backfill: treat the old single target_reps as both ends of the range for
-- now (a "range" of exactly one number) -- preserves existing data without
-- guessing at real ranges; edit them for real on the Program page after.
update strength_program_exercises
set target_reps_min = coalesce(target_reps_min, target_reps),
    target_reps_max = coalesce(target_reps_max, target_reps)
where target_reps_min is null or target_reps_max is null;

alter table strength_program_exercises alter column target_reps_min set not null;
alter table strength_program_exercises alter column target_reps_max set not null;

alter table strength_program_exercises drop column if exists target_reps;
