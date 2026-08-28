# Training (Running + Strength) — status

This documents an in-progress feature area: standalone "Running Coach"
(`/Users/georgehughes/running`) was folded into this app first, then the
whole thing was renamed "Training" and a Strength area was added alongside
it. Gated by `users.running_access` (kept as the flag name even though it
now covers both areas — same single-user gate, no need for a second
column). The original merge plan is at
`~/.claude/plans/agile-stirring-crane.md` — read that for the Running port's
"why"; this file tracks current status for the whole Training area.

## Structure

- Nav: one "Training" sidebar item → `/training` → `/training/running`.
- `TrainingAreaSwitch` (pills: Running / Strength) sits at the top of every
  page in both areas, above each area's own sub-nav (`RunningSubNav` /
  `StrengthSubNav`).
- Routes: `/training/running/*` (Dashboard, Plan, a run's own page, Upload,
  History, History detail, Settings) and `/training/strength/*` (Dashboard,
  Program, Log/:plannedSessionId, History, History detail).

## Running — done

Ported from the standalone app, real data migrated for the `George`
account, including the full multi-week Plan page and a per-run page (full
prescription, ordered steps with a per-step heart-rate target, mark done/
skip/upload). `resize.js` was never ported (plan-length-resize utility,
deferred) — the only known gap left.

Two real bugs hit and fixed post-migration, worth knowing about if
something in this area looks odd again: (1) `prescription_json`/
`splits_json`/etc. must be treated as native objects end to end — no
`JSON.stringify()` on write or `JSON.parse()` on read anywhere for those
columns (a mix of both was exactly what caused a black-screen crash on
real data); (2) ids are UUIDs now, not sqlite ints — never wrap one in
`Number(...)`.

## Strength — done

- **Schema**: two migration files, **both need running in the Supabase SQL
  editor** if not already: `migration_strength_feature.sql` (base tables)
  and `migration_strength_weeks.sql` (weekly structure, added after the
  base tables — adds `strength_program_weeks`, `strength_planned_sessions`,
  plus `is_optional` on days and `planned_session_id` on sessions). Both
  purely additive.
- **Model**: the program (days → exercises, each with target sets/reps/
  weight) is entered once by hand on the Program page — no generator, like
  Running's plan. It then works like Running's plan/planned-run split: a
  week — labelled "WC 24th August", the Monday it starts, via
  `weekCommencingLabel` in `src/lib/strength/format.js` — auto-generates one
  planned session per *current* program day on first visit that week
  (`ensureCurrentStrengthWeek` in `src/lib/strength/bootstrap.js`; a day
  added mid-week won't retroactively appear until the following week). Each
  planned session gets marked done (full manual log, or a quick no-file
  tick), skipped, or undone — same three actions as Running.
  `strength_program_days.is_optional` marks the extra "if I have chance"
  day distinctly (checkbox on Add Day, badge wherever it's shown).
- `src/lib/strength/db.js` — data access. `src/lib/strength/scoring.js` —
  the scoring/progression logic, both pure and unit-testable:
  - **Score** (0–100): each set scores on `(reps × weight) / (target reps ×
    target weight)`, capped at 100 for overshoot. Exercise score = average
    of its sets. Session score = average of its exercises.
  - **Progression suggestion** (shown per exercise on the session detail
    page): hit target reps at target weight on every set for the last 2
    sessions → suggests +2.5kg. Reps well below target (< 80%) last
    session → suggests holding or easing back. Otherwise → hold and keep
    working the current weight. This is a simple, explainable v1 rule, not
    tuned against anything — tell me if the actual suggestions feel wrong
    once there's real data and it can be adjusted.
- Pages: `StrengthProgramPage` (define days/exercises), `StrengthDashboardPage`
  (this week's planned sessions → log/mark done/skip), `StrengthLogPage`
  (enter actual reps/weight per set, pre-filled with targets),
  `StrengthHistoryPage` / `StrengthHistoryDetailPage` (past sessions,
  per-exercise breakdown + progression suggestion).
- George's real program is seeded: Chest + Triceps, Back + Biceps,
  Shoulders + Legs (all at a 0kg placeholder weight — needs real working
  weights set on the Program page before scores mean anything). A 4th
  optional "Upper" day was mentioned but exercises not given yet.

## Not done yet

- **Garmin upload for Strength.** Logging is manual-entry only right now.
  Garmin's strength-activity export format hasn't been seen yet (likely
  FIT, possibly TCX with extensions) — building a parser blind risks
  guessing the structure wrong. **Need a sample exported file** (a
  completed strength session exported from Garmin Connect) before this can
  be built properly, the same way the Running GPX/TCX parsers were built
  against real files rather than guessed.
- `resize.js` port for Running (see above).
- The Garmin **push** Edge Function for Running (pushing planned workouts
  *to* Garmin) — separate from Strength upload, still pending; see the plan
  file for that design.

## Known quirks worth knowing about

- This Supabase project has had stretches of genuinely erratic latency —
  confirmed project-wide (old, unrelated tables affected too, not just
  Training's), not caused by anything in this codebase. If something seems
  hung, check https://status.supabase.com before assuming a code bug.
- `ensurePlanBootstrapped` (`src/lib/running/bootstrap.js`) tolerates a
  duplicate-profile race (e.g. React StrictMode's double effect in dev) by
  swallowing the primary-key violation from the loser — intentional, not a
  bug if you see it in the code.
