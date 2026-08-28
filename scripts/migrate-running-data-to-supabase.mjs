// One-time migration: moves the real data out of the standalone Running
// Coach app's local sqlite file into Spending's Supabase running_* tables
// for one named user.
//
// Usage:
//   node scripts/migrate-running-data-to-supabase.mjs --user=George              # dry run (default)
//   node scripts/migrate-running-data-to-supabase.mjs --user=George --write      # actually writes
//
// Requires the target Supabase user to already have a running_profiles row
// (created by ensurePlanBootstrapped on first visit to /running) -- this
// script overwrites that placeholder profile and replaces its default
// bootstrap plan with the real one, rather than creating the profile itself.

import { DatabaseSync } from 'node:sqlite'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SPENDING_ROOT = path.resolve(__dirname, '..')
const DEFAULT_SQLITE_PATH = '/Users/georgehughes/running/data/running.db'

function parseArgs(argv) {
  const args = { write: false, user: null, db: DEFAULT_SQLITE_PATH }
  for (const arg of argv) {
    if (arg === '--write') args.write = true
    else if (arg.startsWith('--user=')) args.user = arg.slice('--user='.length)
    else if (arg.startsWith('--db=')) args.db = arg.slice('--db='.length)
  }
  return args
}

function loadEnv(envPath) {
  const text = readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (key && value) env[key] = value
  }
  return env
}

function toBool(v) {
  return v === 1 || v === true
}

function toDateOnly(isoOrDate) {
  if (!isoOrDate) return null
  return String(isoOrDate).slice(0, 10)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!args.user) {
    console.error('Usage: node migrate-running-data-to-supabase.mjs --user=<name> [--write]')
    console.error('(Run without --user first is not supported -- the target account must be named explicitly.)')
    process.exit(1)
  }

  const env = loadEnv(path.join(SPENDING_ROOT, '.env'))
  const supabaseUrl = env.VITE_SUPABASE_URL
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in spending/.env')
    process.exit(1)
  }
  const supabase = createClient(supabaseUrl, supabaseKey)

  if (!existsSync(args.db)) {
    console.error(`Sqlite file not found: ${args.db}`)
    process.exit(1)
  }
  const sqlite = new DatabaseSync(args.db, { readOnly: true })

  // --- 1. Resolve and confirm the target user -----------------------------
  const { data: users, error: usersError } = await supabase.from('users').select('id, name')
  if (usersError) throw usersError
  console.log('Spending accounts found:')
  for (const u of users) console.log(`  - ${u.name}  (${u.id})`)

  const target = users.find((u) => u.name.toLowerCase() === args.user.toLowerCase())
  if (!target) {
    console.error(`No Spending account named "${args.user}". Pass --user=<one of the names above>.`)
    process.exit(1)
  }
  console.log(`\nTarget account: ${target.name} (${target.id})\n`)

  const { data: existingProfile, error: profileCheckError } = await supabase
    .from('running_profiles')
    .select('user_id')
    .eq('user_id', target.id)
    .maybeSingle()
  if (profileCheckError) throw profileCheckError
  if (!existingProfile) {
    console.error(`${target.name} has no running_profiles row yet -- visit /running once in the app first (it bootstraps a placeholder profile this script then overwrites), then re-run.`)
    process.exit(1)
  }

  // --- 2. Read source data from sqlite -------------------------------------
  const profile = sqlite.prepare('select * from athlete_profile where id = 1').get()
  const planWeeks = sqlite.prepare('select * from plan_weeks order by week_number').all()
  const plannedRuns = sqlite.prepare('select * from planned_runs order by week_number, id').all()
  const completedRuns = sqlite.prepare('select * from completed_runs order by id').all()
  const fitnessHistory = sqlite.prepare('select * from fitness_history order by id').all()

  console.log('Source (sqlite):')
  console.log(`  profile: ${profile ? '1 row' : 'none'}`)
  console.log(`  plan_weeks: ${planWeeks.length}`)
  console.log(`  planned_runs: ${plannedRuns.length}`)
  console.log(`  completed_runs: ${completedRuns.length}`)
  console.log(`  fitness_history: ${fitnessHistory.length}`)

  if (!profile) {
    console.error('No athlete_profile row in sqlite -- nothing to migrate.')
    process.exit(1)
  }

  const { count: existingWeeks } = await supabase.from('running_plan_weeks').select('id', { count: 'exact', head: true }).eq('user_id', target.id)
  const { count: existingRuns } = await supabase.from('running_planned_runs').select('id', { count: 'exact', head: true }).eq('user_id', target.id)
  console.log(`\nExisting Supabase data for ${target.name} that will be REPLACED:`)
  console.log(`  running_plan_weeks: ${existingWeeks} (will be deleted and re-inserted)`)
  console.log(`  running_planned_runs: ${existingRuns} (will be deleted and re-inserted -- cascades to completed_runs and fitness_history)`)

  if (!args.write) {
    console.log('\nDry run only -- no writes made. Re-run with --write to actually migrate.')
    return
  }

  // --- 3. Clear the placeholder bootstrap data -----------------------------
  // running_completed_runs and running_fitness_history cascade-delete via
  // their FK to running_planned_runs, so deleting planned_runs is enough.
  const del1 = await supabase.from('running_planned_runs').delete().eq('user_id', target.id)
  if (del1.error) throw del1.error
  const del2 = await supabase.from('running_plan_weeks').delete().eq('user_id', target.id)
  if (del2.error) throw del2.error

  // --- 4. Profile ------------------------------------------------------------
  const profileUpdate = await supabase
    .from('running_profiles')
    .update({
      pb_5k_seconds: profile.pb_5k_seconds,
      pb_5k_date: toDateOnly(profile.pb_5k_date),
      current_fitness_5k_equiv_seconds: profile.current_fitness_5k_equiv_seconds,
      goal_5k_seconds: profile.goal_5k_seconds,
      goal_date: toDateOnly(profile.goal_date),
      observed_max_hr_bpm: profile.observed_max_hr_bpm,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', target.id)
  if (profileUpdate.error) throw profileUpdate.error
  console.log('Profile migrated.')

  // --- 5. Plan weeks -----------------------------------------------------
  const weeksInsert = await supabase
    .from('running_plan_weeks')
    .insert(planWeeks.map((w) => ({
      user_id: target.id,
      week_number: w.week_number,
      start_date: w.start_date,
      end_date: w.end_date,
      phase: w.phase,
      is_deload: toBool(w.is_deload),
    })))
  if (weeksInsert.error) throw weeksInsert.error
  console.log(`Plan weeks migrated: ${planWeeks.length}`)

  // --- 6. Planned runs (capture old id -> new uuid map) -------------------
  // Batched into a single insert (rather than one round-trip per row) since
  // each request currently takes on the order of a minute against this
  // Supabase project -- 25 sequential round-trips would take far too long.
  // (week_number, run_type) is unique per user (matches the sqlite schema's
  // own UNIQUE constraint), so it's a safe correlation key back to the rows
  // we just inserted, which is all we need since running_planned_runs.id is
  // server-generated.
  const { data: insertedRuns, error: runsInsertError } = await supabase
    .from('running_planned_runs')
    .insert(plannedRuns.map((r) => ({
      user_id: target.id,
      week_number: r.week_number,
      run_type: r.run_type,
      target_distance_km: r.target_distance_km,
      target_pace_sec_per_km: r.target_pace_sec_per_km,
      prescription_json: JSON.parse(r.prescription_json),
      status: r.status,
      created_at: r.created_at,
    })))
    .select('id, week_number, run_type')
  if (runsInsertError) throw runsInsertError

  const plannedRunIdMap = new Map()
  for (const r of plannedRuns) {
    const match = insertedRuns.find((x) => x.week_number === r.week_number && x.run_type === r.run_type)
    if (match) plannedRunIdMap.set(r.id, match.id)
  }
  console.log(`Planned runs migrated: ${insertedRuns.length}`)

  // --- 7. Completed runs (remap planned_run_id, capture old->new map) -----
  const completedRunIdMap = new Map()
  for (const c of completedRuns) {
    const newPlannedRunId = plannedRunIdMap.get(c.planned_run_id)
    if (!newPlannedRunId) {
      console.warn(`  Skipping completed_run ${c.id}: its planned_run_id ${c.planned_run_id} wasn't migrated`)
      continue
    }
    const { data, error } = await supabase
      .from('running_completed_runs')
      .insert({
        user_id: target.id,
        planned_run_id: newPlannedRunId,
        source_file_name: c.source_file_name,
        source_format: c.source_format,
        run_date: toDateOnly(c.run_date),
        distance_km: c.distance_km,
        duration_sec: c.duration_sec,
        avg_pace_sec_per_km: c.avg_pace_sec_per_km,
        avg_heart_rate_bpm: c.avg_heart_rate_bpm,
        max_heart_rate_bpm: c.max_heart_rate_bpm,
        elevation_gain_m: c.elevation_gain_m,
        splits_json: JSON.parse(c.splits_json),
        raw_trackpoints_json: c.raw_trackpoints_json ? JSON.parse(c.raw_trackpoints_json) : null,
        analysis_json: c.analysis_json ? JSON.parse(c.analysis_json) : null,
        verdict: c.verdict,
        rating: c.rating,
        performance_vs_target_pct: c.performance_vs_target_pct,
        excluded_from_fitness: toBool(c.excluded_from_fitness),
        uploaded_at: c.uploaded_at,
      })
      .select('id')
      .single()
    if (error) throw error
    completedRunIdMap.set(c.id, data.id)
  }
  console.log(`Completed runs migrated: ${completedRunIdMap.size}`)

  // --- 8. Fitness history (remap completed_run_id) -------------------------
  let fitnessCount = 0
  for (const f of fitnessHistory) {
    const newCompletedRunId = completedRunIdMap.get(f.completed_run_id)
    if (!newCompletedRunId) {
      console.warn(`  Skipping fitness_history ${f.id}: its completed_run_id ${f.completed_run_id} wasn't migrated`)
      continue
    }
    const { error } = await supabase.from('running_fitness_history').insert({
      user_id: target.id,
      completed_run_id: newCompletedRunId,
      fitness_5k_equiv_seconds: f.fitness_5k_equiv_seconds,
      recorded_at: f.recorded_at,
    })
    if (error) throw error
    fitnessCount++
  }
  console.log(`Fitness history migrated: ${fitnessCount}`)

  // --- 9. Verify -------------------------------------------------------------
  const [{ count: vWeeks }, { count: vRuns }, { count: vCompleted }, { count: vFitness }] = await Promise.all([
    supabase.from('running_plan_weeks').select('id', { count: 'exact', head: true }).eq('user_id', target.id),
    supabase.from('running_planned_runs').select('id', { count: 'exact', head: true }).eq('user_id', target.id),
    supabase.from('running_completed_runs').select('id', { count: 'exact', head: true }).eq('user_id', target.id),
    supabase.from('running_fitness_history').select('id', { count: 'exact', head: true }).eq('user_id', target.id),
  ])

  console.log('\nVerification:')
  console.log(`  plan_weeks: ${vWeeks} (expected ${planWeeks.length}) ${vWeeks === planWeeks.length ? 'OK' : 'MISMATCH'}`)
  console.log(`  planned_runs: ${vRuns} (expected ${plannedRuns.length}) ${vRuns === plannedRuns.length ? 'OK' : 'MISMATCH'}`)
  console.log(`  completed_runs: ${vCompleted} (expected ${completedRunIdMap.size}) ${vCompleted === completedRunIdMap.size ? 'OK' : 'MISMATCH'}`)
  console.log(`  fitness_history: ${vFitness} (expected ${fitnessCount}) ${vFitness === fitnessCount ? 'OK' : 'MISMATCH'}`)

  const { data: spotCheck } = await supabase
    .from('running_completed_runs')
    .select('rating, verdict, performance_vs_target_pct')
    .eq('user_id', target.id)
    .limit(1)
    .maybeSingle()
  if (spotCheck && completedRuns[0]) {
    const src = completedRuns[0]
    const ok = spotCheck.rating === src.rating && spotCheck.verdict === src.verdict
    console.log(`  spot check (rating/verdict round-trip): ${ok ? 'OK' : 'MISMATCH'} (${spotCheck.rating}/${spotCheck.verdict} vs source ${src.rating}/${src.verdict})`)
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
