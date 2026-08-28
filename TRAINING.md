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
- Routes: `/training/running/*` (Dashboard, Upload, History, History detail,
  Settings) and `/training/strength/*` (Dashboard, Program, Log/:dayId,
  History, History detail).

## Running — done

Ported from the standalone app, real data migrated for the `George`
account. See git history / the plan file for the port details. Not yet
built: an Instructions page (per-run steps + per-step HR target), and
`resize.js` was never ported (plan-length-resize utility, deferred).

## Strength — done

- **Schema**: `supabase/migration_strength_feature.sql` — **not yet applied,
  needs to be run in the Supabase SQL editor** (same anon-policy convention
  as everything else; purely additive, doesn't touch any existing table).
- **Model**: the program (days → exercises, each with target sets/reps/
  weight) is entered once by hand on the Program page — there's no
  generator, unlike Running's plan. You log actual sessions against it.
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
  (day cards → log), `StrengthLogPage` (enter actual reps/weight per set,
  pre-filled with targets), `StrengthHistoryPage` / `StrengthHistoryDetailPage`
  (past sessions, per-exercise breakdown + progression suggestion).

## Not done yet

- **Garmin upload for Strength.** Logging is manual-entry only right now.
  Garmin's strength-activity export format hasn't been seen yet (likely
  FIT, possibly TCX with extensions) — building a parser blind risks
  guessing the structure wrong. **Need a sample exported file** (a
  completed strength session exported from Garmin Connect) before this can
  be built properly, the same way the Running GPX/TCX parsers were built
  against real files rather than guessed.
- Running's Instructions page and `resize.js` port (see above).
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
