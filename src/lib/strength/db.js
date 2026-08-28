import { supabase } from '../supabaseClient'

const T = {
  days: 'strength_program_days',
  exercises: 'strength_program_exercises',
  sessions: 'strength_sessions',
  logs: 'strength_set_logs',
}

function check(error) {
  if (error) throw new Error(error.message)
}

// ---- program: days ----

export async function getProgramDays(userId) {
  const { data, error } = await supabase.from(T.days).select('*').eq('user_id', userId).order('sort_order')
  check(error)
  return data
}

export async function getDayWithExercises(userId, dayId) {
  const { data: day, error: dayError } = await supabase.from(T.days).select('*').eq('user_id', userId).eq('id', dayId).maybeSingle()
  check(dayError)
  if (!day) return null
  const exercises = await getExercisesForDay(userId, dayId)
  return { ...day, exercises }
}

export async function createDay(userId, fields) {
  const { data, error } = await supabase.from(T.days).insert({ user_id: userId, ...fields }).select().single()
  check(error)
  return data
}

export async function updateDay(userId, dayId, fields) {
  const { error } = await supabase.from(T.days).update(fields).eq('user_id', userId).eq('id', dayId)
  check(error)
}

export async function deleteDay(userId, dayId) {
  const { error } = await supabase.from(T.days).delete().eq('user_id', userId).eq('id', dayId)
  check(error)
}

// ---- program: exercises ----

export async function getExercisesForDay(userId, dayId) {
  const { data, error } = await supabase.from(T.exercises).select('*').eq('user_id', userId).eq('day_id', dayId).order('sort_order')
  check(error)
  return data
}

export async function getAllProgramExercises(userId) {
  const { data, error } = await supabase.from(T.exercises).select('*').eq('user_id', userId).order('sort_order')
  check(error)
  return data
}

export async function createExercise(userId, fields) {
  const { data, error } = await supabase.from(T.exercises).insert({ user_id: userId, ...fields }).select().single()
  check(error)
  return data
}

export async function updateExercise(userId, exerciseId, fields) {
  const { error } = await supabase.from(T.exercises).update(fields).eq('user_id', userId).eq('id', exerciseId)
  check(error)
}

export async function deleteExercise(userId, exerciseId) {
  const { error } = await supabase.from(T.exercises).delete().eq('user_id', userId).eq('id', exerciseId)
  check(error)
}

// ---- sessions ----

function flattenSession(row) {
  const { strength_program_days, ...rest } = row
  return { ...rest, day_label: strength_program_days?.label }
}

const SESSION_SELECT = '*, strength_program_days!inner(label)'

export async function createSession(userId, fields) {
  const { data, error } = await supabase.from(T.sessions).insert({ user_id: userId, ...fields }).select().single()
  check(error)
  return data
}

export async function updateSessionScore(userId, sessionId, score) {
  const { error } = await supabase.from(T.sessions).update({ score }).eq('user_id', userId).eq('id', sessionId)
  check(error)
}

export async function getAllSessions(userId) {
  const { data, error } = await supabase.from(T.sessions).select(SESSION_SELECT).eq('user_id', userId).order('session_date', { ascending: false })
  check(error)
  return data.map(flattenSession)
}

export async function getSessionById(userId, id) {
  const { data, error } = await supabase.from(T.sessions).select(SESSION_SELECT).eq('user_id', userId).eq('id', id).maybeSingle()
  check(error)
  return data ? flattenSession(data) : null
}

export async function deleteSession(userId, id) {
  const { error } = await supabase.from(T.sessions).delete().eq('user_id', userId).eq('id', id)
  check(error)
}

// ---- set logs ----

export async function insertSetLogs(userId, rows) {
  const { error } = await supabase.from(T.logs).insert(rows.map((r) => ({ user_id: userId, ...r })))
  check(error)
}

export async function getSetLogsForSession(userId, sessionId) {
  const { data, error } = await supabase
    .from(T.logs)
    .select('*, strength_program_exercises!inner(name, target_sets, target_reps, target_weight_kg)')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .order('set_number')
  check(error)
  return data.map((row) => {
    const { strength_program_exercises: ex, ...rest } = row
    return { ...rest, exercise_name: ex.name, target_reps: ex.target_reps, target_weight_kg: ex.target_weight_kg }
  })
}

/**
 * Set logs for one exercise across its most recent `sessionCount` distinct
 * sessions (most recent first), each tagged with that session's date --
 * used for the progression suggestion and the weight-history view.
 */
export async function getRecentLogsForExercise(userId, exerciseId, sessionCount = 3) {
  const { data, error } = await supabase
    .from(T.logs)
    .select('*, strength_sessions!inner(session_date)')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .order('session_date', { foreignTable: 'strength_sessions', ascending: false })
  check(error)
  const withDate = data.map((row) => {
    const { strength_sessions, ...rest } = row
    return { ...rest, session_date: strength_sessions.session_date }
  })
  const recentDates = [...new Set(withDate.map((r) => r.session_date))].slice(0, sessionCount)
  const bySession = recentDates.map((date) => ({
    session_date: date,
    sets: withDate.filter((r) => r.session_date === date),
  }))
  return bySession
}

/** Most recent session per program day -- powers the Strength dashboard's day cards. */
export async function getLatestSessionPerDay(userId) {
  const sessions = await getAllSessions(userId)
  const map = {}
  for (const s of sessions) {
    if (!map[s.day_id]) map[s.day_id] = s
  }
  return map
}
