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

function maxWeight(sets) {
  return sets.reduce((max, s) => Math.max(max, s.weight_kg), 0)
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
    const first = maxWeight(sessions[sessions.length - 1].sets)
    const current = maxWeight(sessions[0].sets)
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

/**
 * Current weight as a multiple of bodyweight, ranked highest first -- a
 * genuine relative-strength comparison rather than just "biggest number",
 * since a small isolation movement will never out-lift a leg press in
 * absolute kg but can easily be the one you're proportionally strongest
 * at. Only bodyweight factors into the ratio; height isn't, deliberately
 * -- there's no reliable way to fold limb-length/range-of-motion into a
 * single number without real biomechanical data, and a fabricated-looking
 * "adjustment" would be worse than being upfront that it's not accounted
 * for. If anything, a taller lifter moving weight through a longer range
 * is understated by a raw ratio, not flattered by it.
 */
export function rankRelativeStrength(exercises, bodyweightKg) {
  if (!bodyweightKg) return []
  return exercises
    .filter((ex) => ex.target_weight_kg > 0)
    .map((ex) => ({ exercise: ex, weightKg: ex.target_weight_kg, ratio: ex.target_weight_kg / bodyweightKg }))
    .sort((a, b) => b.ratio - a.ratio)
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
