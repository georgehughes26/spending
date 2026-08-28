// Supabase-backed data access for the Running feature, replacing the old
// standalone app's synchronous sqlite db/queries.ts. Every function is
// scoped by userId (the original had no multi-tenancy at all — Spending's
// account model requires it). Shaped like the rest of Spending's hooks:
// plain async functions returning/throwing, no ORM.
import { supabase } from '../supabaseClient'

const T = {
  profiles: 'running_profiles',
  weeks: 'running_plan_weeks',
  runs: 'running_planned_runs',
  completed: 'running_completed_runs',
  fitness: 'running_fitness_history',
}

function check(error) {
  if (error) throw new Error(error.message)
}

// ---- profile ----

export async function getProfile(userId) {
  const { data, error } = await supabase.from(T.profiles).select('*').eq('user_id', userId).maybeSingle()
  check(error)
  return data
}

export async function hasProfile(userId) {
  return (await getProfile(userId)) !== null
}

export async function createProfile(userId, fields) {
  const { error } = await supabase.from(T.profiles).insert({ user_id: userId, ...fields })
  check(error)
}

export async function updateProfile(userId, fields) {
  const { error } = await supabase.from(T.profiles).update({ ...fields, updated_at: new Date().toISOString() }).eq('user_id', userId)
  check(error)
}

// ---- plan weeks ----

export async function getAllPlanWeeks(userId) {
  const { data, error } = await supabase.from(T.weeks).select('*').eq('user_id', userId).order('week_number')
  check(error)
  return data
}

export async function getPlanWeek(userId, weekNumber) {
  const { data, error } = await supabase.from(T.weeks).select('*').eq('user_id', userId).eq('week_number', weekNumber).maybeSingle()
  check(error)
  return data
}

export async function getMaxWeekNumber(userId) {
  const { data, error } = await supabase
    .from(T.weeks)
    .select('week_number')
    .eq('user_id', userId)
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  check(error)
  return data?.week_number ?? 0
}

export async function insertPlanWeek(userId, week) {
  const { error } = await supabase.from(T.weeks).upsert({ user_id: userId, ...week }, { onConflict: 'user_id,week_number' })
  check(error)
}

export async function updatePlanWeekPhase(userId, weekNumber, phase, isDeload) {
  const { error } = await supabase.from(T.weeks).update({ phase, is_deload: isDeload }).eq('user_id', userId).eq('week_number', weekNumber)
  check(error)
}

export async function deletePlanWeeksAfterWeek(userId, weekNumber) {
  const { error } = await supabase.from(T.weeks).delete().eq('user_id', userId).gt('week_number', weekNumber)
  check(error)
}

// ---- current week (date-based) ----

export async function getCurrentWeekNumber(userId, today = new Date().toISOString().slice(0, 10)) {
  const { data, error } = await supabase
    .from(T.weeks)
    .select('week_number')
    .eq('user_id', userId)
    .lte('start_date', today)
    .gte('end_date', today)
    .maybeSingle()
  check(error)
  if (data) return data.week_number

  const [{ data: first }, { data: last }] = await Promise.all([
    supabase.from(T.weeks).select('week_number, start_date').eq('user_id', userId).order('week_number').limit(1).maybeSingle(),
    supabase.from(T.weeks).select('week_number').eq('user_id', userId).order('week_number', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (!first || !last) return undefined
  return today < first.start_date ? first.week_number : last.week_number
}

// ---- planned runs ----

const RUN_TYPE_ORDER = { easy: 0, interval: 1, tempo: 2, time_trial: 2 }

export async function getPlannedRunsForWeek(userId, weekNumber) {
  const { data, error } = await supabase.from(T.runs).select('*').eq('user_id', userId).eq('week_number', weekNumber)
  check(error)
  return [...data].sort((a, b) => (RUN_TYPE_ORDER[a.run_type] ?? 3) - (RUN_TYPE_ORDER[b.run_type] ?? 3))
}

export async function getAllPlannedRuns(userId) {
  const { data, error } = await supabase.from(T.runs).select('*').eq('user_id', userId).order('week_number').order('id')
  check(error)
  return data
}

export async function getPlannedRunById(userId, id) {
  const { data, error } = await supabase.from(T.runs).select('*').eq('user_id', userId).eq('id', id).maybeSingle()
  check(error)
  return data
}

/**
 * Mirrors the sqlite ON CONFLICT(week_number, run_type) DO UPDATE ...
 * WHERE status='upcoming' guard — the core safety mechanism protecting
 * completed/skipped weeks from being silently overwritten by a plan
 * regeneration. Supabase upsert can't express a partial-conflict WHERE
 * clause, so this reads the existing row first and only writes when safe.
 */
export async function upsertPlannedRun(userId, run) {
  const existing = await supabase
    .from(T.runs)
    .select('id, status')
    .eq('user_id', userId)
    .eq('week_number', run.week_number)
    .eq('run_type', run.run_type)
    .maybeSingle()
  check(existing.error)

  if (existing.data && existing.data.status !== 'upcoming') return // protected history — leave untouched

  const { error } = await supabase.from(T.runs).upsert({ user_id: userId, ...run }, { onConflict: 'user_id,week_number,run_type' })
  check(error)
}

export async function deletePlannedRunsAfterWeek(userId, weekNumber) {
  const { error } = await supabase.from(T.runs).delete().eq('user_id', userId).gt('week_number', weekNumber)
  check(error)
}

export async function countPlannedRunsAfterWeekNotUpcoming(userId, weekNumber) {
  const { count, error } = await supabase
    .from(T.runs)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gt('week_number', weekNumber)
    .neq('status', 'upcoming')
  check(error)
  return count ?? 0
}

export async function getNextUpcomingByType(userId, runType, afterWeekNumber) {
  const { data, error } = await supabase
    .from(T.runs)
    .select('*')
    .eq('user_id', userId)
    .eq('run_type', runType)
    .eq('status', 'upcoming')
    .gt('week_number', afterWeekNumber)
    .order('week_number')
    .limit(1)
    .maybeSingle()
  check(error)
  return data
}

export async function updatePlannedRunPrescription(userId, id, fields) {
  const { error } = await supabase.from(T.runs).update(fields).eq('user_id', userId).eq('id', id)
  check(error)
}

export async function markPlannedRunCompleted(userId, id) {
  const { error } = await supabase.from(T.runs).update({ status: 'completed' }).eq('user_id', userId).eq('id', id)
  check(error)
}

/** Manually ticks off a run with no file/analysis — e.g. done but not tracked with GPS. */
export async function markPlannedRunCompletedManually(userId, id) {
  const { error } = await supabase.from(T.runs).update({ status: 'completed' }).eq('user_id', userId).eq('id', id).eq('status', 'upcoming')
  check(error)
}

/** Marks a run as intentionally not being done this cycle — no fitness impact, nothing to analyze. */
export async function markPlannedRunSkipped(userId, id) {
  const { error } = await supabase.from(T.runs).update({ status: 'skipped' }).eq('user_id', userId).eq('id', id).eq('status', 'upcoming')
  check(error)
}

/** Reopens a run (used when deleting the completed_run that closed it) so it can be uploaded again. */
export async function markPlannedRunUpcoming(userId, id) {
  const { error } = await supabase.from(T.runs).update({ status: 'upcoming' }).eq('user_id', userId).eq('id', id)
  check(error)
}

/** Undoes an accidental skip — only valid from 'skipped', unlike markPlannedRunUpcoming. */
export async function unskipPlannedRun(userId, id) {
  const { error } = await supabase.from(T.runs).update({ status: 'upcoming' }).eq('user_id', userId).eq('id', id).eq('status', 'skipped')
  check(error)
}

// ---- completed runs ----

function flattenCompletedRun(row) {
  const { running_planned_runs, ...rest } = row
  return { ...rest, ...running_planned_runs }
}

const COMPLETED_RUN_SELECT = '*, running_planned_runs!inner(run_type, week_number, target_distance_km, target_pace_sec_per_km, prescription_json)'

export async function insertCompletedRun(userId, fields) {
  const { data, error } = await supabase.from(T.completed).insert({ user_id: userId, ...fields }).select().single()
  check(error)
  return data
}

export async function getAllCompletedRuns(userId) {
  const { data, error } = await supabase
    .from(T.completed)
    .select(COMPLETED_RUN_SELECT)
    .eq('user_id', userId)
    .order('run_date', { ascending: false })
  check(error)
  return data.map(flattenCompletedRun)
}

export async function getCompletedRunById(userId, id) {
  const { data, error } = await supabase.from(T.completed).select(COMPLETED_RUN_SELECT).eq('user_id', userId).eq('id', id).maybeSingle()
  check(error)
  return data ? flattenCompletedRun(data) : null
}

/** Deletes a completed run and returns the planned_run_id it belonged to (undefined if not found). */
export async function deleteCompletedRun(userId, id) {
  const { data: row, error: fetchError } = await supabase.from(T.completed).select('planned_run_id').eq('user_id', userId).eq('id', id).maybeSingle()
  check(fetchError)
  if (!row) return undefined
  const { error } = await supabase.from(T.completed).delete().eq('user_id', userId).eq('id', id)
  check(error)
  return row.planned_run_id
}

export async function hasAnyUnratedCompletedRun(userId) {
  const { count, error } = await supabase
    .from(T.completed)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('rating', null)
    .not('verdict', 'is', null)
  check(error)
  return (count ?? 0) > 0
}

export async function updateCompletedRunRating(userId, id, rating) {
  const { error } = await supabase.from(T.completed).update({ rating }).eq('user_id', userId).eq('id', id)
  check(error)
}

/** Keyed by planned_run_id, so pages rendering a plan week can show completion + rating on each card. */
export async function getCompletedRunSummariesByPlannedRunId(userId) {
  const { data, error } = await supabase.from(T.completed).select('id, planned_run_id, verdict, rating').eq('user_id', userId)
  check(error)
  const map = {}
  for (const row of data) map[row.planned_run_id] = { completedRunId: row.id, verdict: row.verdict, rating: row.rating }
  return map
}

// ---- fitness history ----

export async function insertFitnessHistory(userId, completedRunId, fitness5kEquivSeconds) {
  const { error } = await supabase
    .from(T.fitness)
    .insert({ user_id: userId, completed_run_id: completedRunId, fitness_5k_equiv_seconds: fitness5kEquivSeconds })
  check(error)
}

export async function getFitnessHistory(userId) {
  const { data, error } = await supabase.from(T.fitness).select('*').eq('user_id', userId).order('recorded_at')
  check(error)
  return data
}
