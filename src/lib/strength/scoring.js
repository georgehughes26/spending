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
const CRUSHED_IT = 90 // exercise score at/above this counts as "nailed it"
const HOLD_OR_REDUCE_BELOW = 80 // exercise score below this suggests holding/easing back

/** Average set score for one logged session against the current target -- reuses the same ratio-based scoring as the session score itself, so a naturally lighter warm-up set (ramping up to a heavier working set) doesn't fail an all-or-nothing check the way a strict "every set >= target" comparison would. */
function sessionExerciseScore(session, target) {
  const setScores = session.sets.map((s) => computeSetScore(s.reps, s.weight_kg, target.target_reps, target.target_weight_kg))
  return computeExerciseScore(setScores)
}

/**
 * Whether to nudge the weight up, hold, or back off for one exercise, based
 * on its last couple of logged sessions. Simple double-progression style
 * rule: an exercise score of 90+ (essentially hit every rep at target
 * weight) on the last 2 sessions => go up a step. A score well below
 * target => hold or ease back. Otherwise => keep grinding at this weight.
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

  const latestScore = sessionExerciseScore(withSets[0], target)

  if (withSets.length >= 2) {
    const priorScore = sessionExerciseScore(withSets[1], target)
    if (latestScore >= CRUSHED_IT && priorScore >= CRUSHED_IT) {
      const next = Math.round((target.target_weight_kg + WEIGHT_STEP_KG) * 2) / 2
      return {
        action: 'increase',
        suggestedWeightKg: next,
        reason: `Nailed ${target.target_reps}+ reps at ${target.target_weight_kg}kg across your last 2 sessions -- try ${next}kg next time.`,
      }
    }
  }

  if (latestScore !== null && latestScore < HOLD_OR_REDUCE_BELOW) {
    return {
      action: 'hold_or_reduce',
      reason: `Fell short of ${target.target_reps} reps at ${target.target_weight_kg}kg last session -- hold this weight or ease back slightly.`,
    }
  }

  // Nailed it last time, just not twice in a row yet -- say so, rather than
  // the generic "keep working towards it" line which reads as if they
  // hadn't hit it at all.
  if (latestScore !== null && latestScore >= CRUSHED_IT) {
    return {
      action: 'hold',
      reason: `Hit ${target.target_reps}+ reps at ${target.target_weight_kg}kg last session -- do it again next time and you'll be ready to go up.`,
    }
  }

  return { action: 'hold', reason: `Keep working at ${target.target_weight_kg}kg until every set hits ${target.target_reps} reps.` }
}
