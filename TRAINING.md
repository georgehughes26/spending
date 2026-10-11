# Training (fitness habit tracker) — status

Replaces the old Running/Strength "Training" feature (ported from a
standalone Running Coach app, plus a manually-entered Strength program) --
that data was explicitly deleted at the user's request (not migrated, the
two domains share no fields) and its code removed. Gated by
`users.running_access`, kept as the flag name for the same reason it was
before: one single-user gate, no need for a second column.

## Setup required before this works

The schema lives in `supabase/migration_habit_tracker.sql` and has **not
been run yet** -- it needs to be pasted into the Supabase SQL editor once.
Until then every Training page shows a clear "run the migration" error
instead of crashing or hanging. The old `running_*`/`strength_*` tables'
rows are already deleted; dropping the tables themselves is optional SQL
at the bottom of the same migration file.

## Structure

- Nav: one "Training" sidebar item → `/training` (today's day view).
- `TrainingSubNav` (Today / Week / Settings pills) sits at the top of every
  page.
- Routes: `/training` and `/training/day/:date` (day view), `/training/week`
  and `/training/week/:weekStart` (weekly summary), `/training/settings`.

## Model

- `habit_settings` — one row per user: plan_start, goal_date, start/goal
  weight, calorie tolerance.
- `habit_day_templates` — default sessions/calories/protein/steps/water per
  weekday (0 Mon .. 6 Sun), editable in Settings.
- `habit_week_plans` — imported coach plans, one row per (user, week_start
  Monday); re-importing the same week replaces the row. `days` is a 7-entry
  jsonb array mirroring the import JSON shape.
- `habit_custom_definitions` — habits added beyond the built-in set
  (Creatine, Vitamin D, Weight, Calories, Protein, Steps, Water, Drinks).
- `habit_daily_logs` — one row per logged date. `session_ticks` is an array
  of booleans aligned by **position**, not name, to that date's resolved
  sessions list -- this is what lets a renamed/removed session in a
  re-imported week plan keep an existing tick with zero special-case
  migration code: the tick just stays attached to whichever session is now
  at that index. `custom_values` is a jsonb map keyed by custom habit id.

`src/lib/habits/` holds all the pure logic, each piece testable in
isolation and verified against the brief's own example numbers before this
was wired into the UI: `dayPlan.js` (resolves a date's effective plan --
week plan override, else template), `goalLine.js` (goal line, 7-day trend,
on-track status, kg/week still needed), `weekPlan.js` (import validation +
diff/preview), `checkin.js` (the exact plain-text check-in export),
`streaks.js` (current/best per habit, recomputed from full history every
time -- not an incrementally maintained counter, so filling in a missed
day retroactively re-stitches the streak correctly for free), `nudges.js`.
`src/hooks/useTrainingData.js` is the one place that mutates
`habit_daily_logs`, specifically so the jsonb-merge rule (spread the
existing `session_ticks`/`custom_values` before writing, since a partial
jsonb payload replaces the whole column rather than merging keys into it)
lives in exactly one place.

## Known interpretation calls worth knowing about

The brief was very detailed but left a few specifics to judgement; these
are the calls made, flagged here in case they should be revisited once
there's real usage to check them against:

- Check-in export: a day's **Sessions** column always shows the planned
  session names (ticked ones get a ✓) rather than "—", even on a day with
  nothing else logged -- the "show '—' for anything not logged" rule read
  as being about *logged figures*, and sessions are plan data known
  regardless of logging state. Every other column follows the literal
  per-field "—" rule.
- A rest day (no sessions) renders as `Rest` in the check-in's Sessions
  column.
- Positive streak nudges ("Creatine 7 days in a row") fire once a streak
  reaches 3, not just at 7 -- the brief's "7 days in a row" was one
  example, not a stated threshold.
- "Missed session" nudges look at the 7 days *before* today, not including
  today, so an undone-but-not-yet-due session today isn't flagged as missed.
- Nice-to-haves (run time/distance log, lift log) were explicitly left for
  after the core per the brief's own suggested build order -- not built yet.
