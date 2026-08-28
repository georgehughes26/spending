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

const WEIGHT_STEP_KG = 2.5

/**
 * Real double-progression rule, driven purely by reps -- weight doesn't
 * gate it (a naturally lighter warm-up set ramping to a heavier working set
 * shouldn't block "did you hit the top of your rep range"):
 *
 *   - every set at/above target_reps_max, 2 sessions running => go up a step
 *   - every set at/above target_reps_max last session (but not 2 running
 *     yet) => hold, you're one good session from earning the increase
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

  const hitTop = (session) => session.sets.every((s) => s.reps >= target.target_reps_max)
  const avgReps = (session) => session.sets.reduce((sum, s) => sum + s.reps, 0) / session.sets.length

  if (withSets.length >= 2 && withSets.slice(0, 2).every(hitTop)) {
    const next = Math.round((target.target_weight_kg + WEIGHT_STEP_KG) * 2) / 2
    return {
      action: 'increase',
      suggestedWeightKg: next,
      reason: `Hit ${target.target_reps_max} reps on every set across your last 2 sessions at ${target.target_weight_kg}kg -- try ${next}kg next time.`,
    }
  }

  const latest = withSets[0]

  if (avgReps(latest) < target.target_reps_min) {
    return {
      action: 'hold_or_reduce',
      reason: `Fell below your ${target.target_reps_min}-${target.target_reps_max} rep range last session (avg ${avgReps(latest).toFixed(1)}) -- hold this weight or ease back slightly.`,
    }
  }

  if (hitTop(latest)) {
    return {
      action: 'hold',
      reason: `Hit the top of your range (${target.target_reps_max} reps) at ${target.target_weight_kg}kg last session -- do it again next time and you'll be ready to go up.`,
    }
  }

  return {
    action: 'hold',
    reason: `Working through your ${target.target_reps_min}-${target.target_reps_max} rep range at ${target.target_weight_kg}kg -- add weight once you hit ${target.target_reps_max} on every set.`,
  }
}
