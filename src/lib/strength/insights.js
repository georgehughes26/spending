import { suggestProgression } from './scoring'

/**
 * Groups a flat list of set logs (db.getAllSetLogsWithDates's shape) into
 * per-exercise session lists, each `{ session_date, sets: [...] }`, most
 * recent session first -- the same shape suggestProgression expects, and
 * the shared building block every insight below reduces from.
 */
function groupByExercise(allSetLogs) {
  const byExercise = new Map()
  for (const log of allSetLogs) {
    if (!byExercise.has(log.exercise_id)) byExercise.set(log.exercise_id, new Map())
    const bySession = byExercise.get(log.exercise_id)
    if (!bySession.has(log.session_date)) bySession.set(log.session_date, [])
    bySession.get(log.session_date).push(log)
  }
  const result = new Map()
  for (const [exerciseId, bySession] of byExercise) {
    const sessions = [...bySession.entries()]
      .map(([session_date, sets]) => ({ session_date, sets }))
      .sort((a, b) => (a.session_date < b.session_date ? 1 : -1)) // most recent first
    result.set(exerciseId, sessions)
  }
  return result
}

/**
 * The weight you actually trained at in a session -- whichever weight
 * shows up on the most sets, not just the single heaviest thing you
 * touched. Same reasoning as suggestProgression's hitTop: a 40/40/44 ramp
 * session's real working weight is 40kg, not 44kg, so comparing it to a
 * later 44/44/44 session by raw max weight (both "44kg") hides the
 * progression that actually happened. Ties go to the heavier weight.
 */
function workingWeight(sets) {
  const counts = new Map()
  for (const s of sets) counts.set(s.weight_kg, (counts.get(s.weight_kg) ?? 0) + 1)
  let best = 0
  let bestCount = -1
  for (const [weight, count] of counts) {
    if (count > bestCount || (count === bestCount && weight > best)) {
      best = weight
      bestCount = count
    }
  }
  return best
}

/**
 * Weight increase per exercise since the first time it was logged, ranked
 * biggest first -- "which exercises am I progressing best at". Needs at
 * least 2 distinct logged sessions to say anything (a single session has
 * nothing to compare against, same as the per-session progression call).
 */
export function rankProgression(exercises, allSetLogs) {
  const sessionsByExercise = groupByExercise(allSetLogs)
  const rows = []
  for (const ex of exercises) {
    const sessions = sessionsByExercise.get(ex.id)
    if (!sessions || sessions.length < 2) continue
    const first = workingWeight(sessions[sessions.length - 1].sets)
    const current = workingWeight(sessions[0].sets)
    if (first <= 0) continue
    rows.push({
      exercise: ex,
      firstWeightKg: first,
      currentWeightKg: current,
      deltaKg: Math.round((current - first) * 10) / 10,
      deltaPct: (current - first) / first,
      sessionsLogged: sessions.length,
    })
  }
  return rows.sort((a, b) => b.deltaPct - a.deltaPct)
}

/**
 * How many exercises are trending up / flat / down, and the average % gain
 * among those with enough data -- the single "overall progression" number.
 * Returns null when nothing has 2+ sessions yet (nothing to report).
 */
export function overallProgression(exercises, allSetLogs) {
  const ranked = rankProgression(exercises, allSetLogs)
  if (ranked.length === 0) return null
  const up = ranked.filter((r) => r.deltaKg > 0).length
  const flat = ranked.filter((r) => r.deltaKg === 0).length
  const down = ranked.filter((r) => r.deltaKg < 0).length
  const avgPct = ranked.reduce((sum, r) => sum + r.deltaPct, 0) / ranked.length
  return { trackedCount: ranked.length, up, flat, down, avgPct }
}

/** Exercises suggestProgression currently says are ready for more weight, or have fallen off and need easing back. */
export function exercisesNeedingAttention(exercises, allSetLogs) {
  const sessionsByExercise = groupByExercise(allSetLogs)
  const ready = []
  const struggling = []
  for (const ex of exercises) {
    const sessions = sessionsByExercise.get(ex.id) ?? []
    const suggestion = suggestProgression(
      { target_reps_min: ex.target_reps_min, target_reps_max: ex.target_reps_max, target_weight_kg: ex.target_weight_kg },
      sessions,
    )
    if (suggestion.action === 'increase') ready.push({ exercise: ex, suggestion })
    else if (suggestion.action === 'hold_or_reduce') struggling.push({ exercise: ex, suggestion })
  }
  return { ready, struggling }
}
