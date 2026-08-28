function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * A single set's score out of 100, based on volume (reps x weight) actually
 * done vs prescribed. Dead on target = 100; short on either reps or weight
 * scales it down proportionally; overshooting caps at 100 rather than going
 * above it (a 0-100 score reads oddly past its own ceiling) -- overshoot is
 * instead what feeds the progression suggestion below, not the score.
 */
export function computeSetScore(actualReps, actualWeightKg, targetReps, targetWeightKg) {
  if (!targetReps || !targetWeightKg) return null
  const ratio = (actualReps * actualWeightKg) / (targetReps * targetWeightKg)
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
const HOLD_THRESHOLD = 0.8 // avg reps below 80% of target => suggest holding/reducing

/**
 * Whether to nudge the weight up, hold, or back off for one exercise, based
 * on its last couple of logged sessions. Simple double-progression style
 * rule: hit target reps at target weight (or better) on every set across
 * the last 2 sessions => go up a step. Falling well short of target reps
 * last time => hold or ease back. Otherwise => keep grinding at this weight.
 *
 * `recentSessions` is `getRecentLogsForExercise`'s return shape: most
 * recent first, each `{ session_date, sets: [{reps, weight_kg}, ...] }`.
 */
export function suggestProgression(target, recentSessions) {
  if (!target.target_weight_kg) {
    return { action: 'no_data', reason: 'Log this exercise once to start tracking weight and progression.' }
  }

  const withSets = recentSessions.filter((s) => s.sets.length > 0)

  if (withSets.length === 0) {
    return { action: 'no_data', reason: 'No logged sessions yet for this exercise.' }
  }

  const hitAll = (session) =>
    session.sets.every((s) => s.reps >= target.target_reps && s.weight_kg >= target.target_weight_kg)

  if (withSets.length >= 2 && withSets.slice(0, 2).every(hitAll)) {
    const next = Math.round((target.target_weight_kg + WEIGHT_STEP_KG) * 2) / 2
    return {
      action: 'increase',
      suggestedWeightKg: next,
      reason: `Hit ${target.target_reps}+ reps at ${target.target_weight_kg}kg on every set across your last 2 sessions -- try ${next}kg next time.`,
    }
  }

  const latest = withSets[0]
  const avgReps = latest.sets.reduce((sum, s) => sum + s.reps, 0) / latest.sets.length
  if (avgReps < target.target_reps * HOLD_THRESHOLD) {
    return {
      action: 'hold_or_reduce',
      reason: `Reps dropped well below target last session (avg ${avgReps.toFixed(1)} vs ${target.target_reps}) -- hold this weight or ease back slightly.`,
    }
  }

  return { action: 'hold', reason: `Keep working at ${target.target_weight_kg}kg until every set hits ${target.target_reps} reps.` }
}
