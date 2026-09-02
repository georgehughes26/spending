function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * A single set's score out of 100, based on volume (reps x weight) against
 * the top of the rep range at the current tracked weight. Dead on target
 * (max reps, current weight) = 100; short on either scales it down
 * proportionally; overshooting caps at 100 rather than going above it.
 */
export function computeSetScore(actualReps, actualWeightKg, targetRepsMax, targetWeightKg) {
  if (!targetRepsMax || !targetWeightKg) return null
  const ratio = (actualReps * actualWeightKg) / (targetRepsMax * targetWeightKg)
  return Math.round(clamp(ratio, 0, 1) * 100)
}

/** Average of its sets' scores. */
export function computeExerciseScore(setScores) {
  const valid = setScores.filter((s) => s !== null)
  if (valid.length === 0) return null
  return Math.round(valid.reduce((sum, s) => sum + s, 0) / valid.length)
}

/** Average of its exercises' scores -- the session's overall 0-100. */
export function computeSessionScore(exerciseScores) {
  const valid = exerciseScores.filter((s) => s !== null)
  if (valid.length === 0) return null
  return Math.round(valid.reduce((sum, s) => sum + s, 0) / valid.length)
}

export const WEIGHT_STEP_KG = 2.5

/**
 * Real double-progression rule: hit the top of your rep range on every
 * working set in a single session and you're ready to go up next time --
 * there's no "prove it twice" requirement, that was an invented add-on
 * that made genuine progress (e.g. going from one top set at a weight to
 * a full session at it) read as "hold, do it again" instead of "go up".
 *
 * `hitTop` only counts a session as "hit top" if at least half its sets
 * were actually done at (or above) the tracked working weight *and* those
 * sets hit target_reps_max -- not just "reps were hit somewhere in the
 * session" (too loose: crediting a single top single as if the whole
 * session was done at that weight is exactly how a 40/40/44 ramp session
 * got treated the same as a 44/44/44 session), and not "every single set
 * including warm-ups" (too strict: a naturally lighter first set ramping
 * up to a heavier working weight would fail this even on a genuinely good
 * session).
 *
 *   - majority of sets at/above tracked weight all hit target_reps_max
 *     last session => go up a step
 *   - average reps below target_reps_min => hold or ease back, you've
 *     fallen out of the range entirely
 *   - otherwise => still working through the range at this weight
 *
 * `recentSessions` is `getRecentLogsForExercise`'s return shape: most
 * recent first, each `{ session_date, sets: [{reps, weight_kg}, ...] }`.
 * `target` is `{ target_reps_min, target_reps_max, target_weight_kg }`.
 */
export function suggestProgression(target, recentSessions) {
  if (!target.target_weight_kg) {
    return { action: 'no_data', reason: 'Log this exercise once to start tracking weight and progression.' }
  }

  const withSets = recentSessions.filter((s) => s.sets.length > 0)
  if (withSets.length === 0) {
    return { action: 'no_data', reason: 'No logged sessions yet for this exercise.' }
  }

  const hitTop = (session) => {
    const atWorkingWeight = session.sets.filter((s) => s.weight_kg >= target.target_weight_kg)
    if (atWorkingWeight.length < Math.ceil(session.sets.length / 2)) return false
    return atWorkingWeight.every((s) => s.reps >= target.target_reps_max)
  }
  const avgReps = (session) => session.sets.reduce((sum, s) => sum + s.reps, 0) / session.sets.length

  const latest = withSets[0]

  if (hitTop(latest)) {
    const next = Math.round((target.target_weight_kg + WEIGHT_STEP_KG) * 2) / 2
    return {
      action: 'increase',
      suggestedWeightKg: next,
      reason: `Hit ${target.target_reps_max} reps on every set at ${target.target_weight_kg}kg last session -- try ${next}kg next time.`,
    }
  }

  if (avgReps(latest) < target.target_reps_min) {
    return {
      action: 'hold_or_reduce',
      reason: `Fell below your ${target.target_reps_min}-${target.target_reps_max} rep range last session (avg ${avgReps(latest).toFixed(1)}) -- hold this weight or ease back slightly.`,
    }
  }

  return {
    action: 'hold',
    reason: `Working through your ${target.target_reps_min}-${target.target_reps_max} rep range at ${target.target_weight_kg}kg -- add weight once you hit ${target.target_reps_max} on every set.`,
  }
}
