# Running Coach → Spending merge — status

This documents an in-progress feature merge: the standalone "Running Coach"
Next.js app (`/Users/georgehughes/running`) is being folded into this app as
a gated feature area, following the exact precedent set by "Reselling"
(`resale_access` flag, `resale_*` tables). The full original plan — schema,
file mapping, visual-identity decision, execution order — is at
`~/.claude/plans/agile-stirring-crane.md`. Read that first for the "why";
this file just tracks "what's actually done."

## Done

- **Schema**: `supabase/migration_running_feature.sql` applied. Tables:
  `running_profiles`, `running_plan_weeks`, `running_planned_runs`,
  `running_completed_runs`, `running_fitness_history`,
  `running_garmin_sessions` (service-role only, no anon policy — mirrors
  `gc_tokens`). `users.running_access` boolean added (default false).
- **Pure logic port**: `src/lib/running/*.js` — direct TS→JS ports of the
  original app's constants/curve/prescriptions/analysis/parsing/format/
  runGuidance/garmin-workout-building code. Verified against the original
  TypeScript test suite's expected values (28/28 assertions passed during
  the port). `resize.js` was **not** ported (plan-length-resize utility,
  deferred as lower priority).
- **Data access**: `src/lib/running/db.js` (async, Supabase-backed,
  replaces the original `db/queries.ts`), plus orchestration in
  `generate.js`, `bootstrap.js`, `backfill.js`, `upload.js`, `calibrate.js`.
- **Hooks**: `useRunningProfile`, `useRunningPlan`, `useRunningCompletedRuns`,
  `useRunningFitnessHistory` — same shape as `useResaleItems.js`.
- **Pages** (all under `/running/*`, gated by `RequireRunningAccess`,
  styled entirely in Spending's own palette/components per the plan's
  explicit "inline with Spending, not its own identity" decision):
  - `RunningDashboardPage` — this week, on-track gauge, fitness progress
  - `RunningUploadPage` — GPX/TCX upload with auto-match to nearest run
  - `RunningSettingsPage` — profile edit + calibrate-from-runs
  - `RunningHistoryPage` / `RunningHistoryDetailPage` — list + score
    breakdown + splits
  - `RunningSubNav` — tab row linking the four pages above
- **Nav/routing**: wired in `App.jsx` and `AuthContext.jsx`
  (`running_access` in `USER_COLUMNS`).
- **Real data migrated**: `scripts/migrate-running-data-to-supabase.mjs`
  moved the actual profile/plan/history from the sqlite file into Supabase
  for the `George` account. **This already ran successfully — do not run
  it again** (it's destructive: it deletes and replaces that user's
  `running_plan_weeks`/`running_planned_runs`, which cascades to completed
  runs and fitness history). It's kept in the repo for reference / in case
  a genuinely new migration is ever needed, not as a routine command.

## Not done yet

- **Instructions page** — per-run ordered steps with per-step heart-rate
  targets (warm up / each interval / tempo / cool down). Has no equivalent
  built yet; original is `app/runs/[id]` + `components/RunSteps.tsx` in the
  standalone app.
- **`resize.js` port** — plan-length-resize utility, not ported.
- **Garmin push Edge Function** — `supabase/functions/garmin-push/`. The
  standalone app already has a *working* unofficial Garmin Connect push
  (`lib/garmin/client.ts`, `lib/garmin/buildWorkout.ts` in
  `/Users/georgehughes/running`) — the plan is to port that into a Supabase
  Edge Function, starting with a feasibility spike (Deno's Node-compat
  layer running the `garmin-connect` npm package is unverified), reusing
  the `gc_tokens`/`_shared/gocardless.ts` token-caching pattern for the new
  `running_garmin_sessions` table.

## Known quirks worth knowing about

- This Supabase project has occasionally been very slow (single requests
  taking 20–40s+) for stretches with no obvious cause — not something this
  merge introduced. If something seems hung, check whether a plain read
  against any table is also slow before assuming a code bug.
- `ensurePlanBootstrapped` (`src/lib/running/bootstrap.js`) tolerates a
  duplicate-profile race (two concurrent first-loads, e.g. React
  StrictMode's double effect in dev) by swallowing the primary-key
  violation from the loser — this is intentional, not a bug if you see it
  in the code.
