import { suggestProgression, WEIGHT_STEP_KG } from './scoring'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

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
 * How far through its rep range a session's working-weight sets got, as a
 * 0-1 fraction -- e.g. hitting the bottom of the range is 0, the top is 1.
 * Used so a session's "progress score" (see rankProgression) can credit
 * genuine progress made *within* a weight (working up through the rep
 * range) and not just weight increases, without that credit reversing
 * itself the moment reps correctly reset after a real weight increase.
 */
function repProgressFraction(sets, weight, targetRepsMin, targetRepsMax) {
  if (targetRepsMax <= targetRepsMin) return 0
  const atWeight = sets.filter((s) => s.weight_kg === weight)
  if (atWeight.length === 0) return 0
  const avgReps = atWeight.reduce((sum, s) => sum + s.reps, 0) / atWeight.length
  return clamp((avgReps - targetRepsMin) / (targetRepsMax - targetRepsMin), 0, 1)
}

/**
 * A session's "effective weight": the weight you trained at, plus a
 * fraction of a weight-step credited for how far through the rep range you
 * got at that weight. Raw volume (reps x weight) was considered and
 * rejected -- it *drops* the moment you correctly increase weight and reset
 * reps to the bottom of the range per double progression, which would show
 * as regression at exactly the moment real progress happened. Raw working
 * weight alone was also considered -- it's right for the "should I go up"
 * question (suggestProgression), but stays flat while you're legitimately
 * climbing the rep range at an unchanged weight, which this metric credits
 * as partial progress instead of hiding it.
 */
function sessionProgressScore(session, targetRepsMin, targetRepsMax) {
  const weight = workingWeight(session.sets)
  const fraction = repProgressFraction(session.sets, weight, targetRepsMin, targetRepsMax)
  return { weight, score: weight + WEIGHT_STEP_KG * fraction }
}

/**
 * Progress per exercise since the first time it was logged, ranked biggest
 * first -- "which exercises am I progressing best at". Needs at least 2
 * distinct logged sessions to say anything (a single session has nothing
 * to compare against, same as the per-session progression call). Displayed
 * weights are real (the weight you actually trained at each time); the
 * ranking and % are based on the progress score above, which can move even
 * when the displayed weight hasn't -- see sessionProgressScore.
 */
export function rankProgression(exercises, allSetLogs) {
  const sessionsByExercise = groupByExercise(allSetLogs)
  const rows = []
  for (const ex of exercises) {
    const sessions = sessionsByExercise.get(ex.id)
    if (!sessions || sessions.length < 2) continue
    const first = sessionProgressScore(sessions[sessions.length - 1], ex.target_reps_min, ex.target_reps_max)
    const current = sessionProgressScore(sessions[0], ex.target_reps_min, ex.target_reps_max)
    if (first.weight <= 0) continue
    rows.push({
      exercise: ex,
      firstWeightKg: first.weight,
      currentWeightKg: current.weight,
      deltaKg: Math.round((current.score - first.score) * 10) / 10,
      deltaPct: (current.score - first.score) / first.score,
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
