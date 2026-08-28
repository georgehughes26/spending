import {
  DELOAD_VOLUME_FACTOR,
  DEVELOPMENT_PHASE_WEIGHTS,
  MAX_WEEKLY_PACE_CHANGE,
  PHASE_END_FRACTIONS,
  PLAN_GOAL_5K_SECONDS,
  PLAN_LENGTH_CEILING_WEEKS,
  PLAN_LENGTH_FLOOR_WEEKS,
  PLAN_START_5K_SECONDS,
} from './constants'

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

const DEVELOPMENT_ORDER = ['base', 'build1', 'build2', 'peak']

/**
 * Builds phase boundaries for an arbitrary total plan length. Taper and test
 * are always exactly 1 week each; the 4 development phases split the rest by
 * largest-remainder apportionment (weights in DEVELOPMENT_PHASE_WEIGHTS),
 * minimum 1 week each, remainder ties broken toward the earlier phase
 * (protect base-building first when the plan is short). The cumulative
 * endFraction targets are fixed regardless of week count — they encode the
 * front-loaded "hardest gains, smallest steps" shape, not a specific length.
 */
export function buildPhaseTable(totalWeeks) {
  const development = totalWeeks - 2 // taper(1) + test(1)
  const totalWeight = DEVELOPMENT_ORDER.reduce((s, p) => s + DEVELOPMENT_PHASE_WEIGHTS[p], 0)

  const raw = {}
  for (const p of DEVELOPMENT_ORDER) raw[p] = (DEVELOPMENT_PHASE_WEIGHTS[p] / totalWeight) * development

  const weeks = {}
  for (const p of DEVELOPMENT_ORDER) weeks[p] = Math.max(1, Math.floor(raw[p]))

  let remainder = development - DEVELOPMENT_ORDER.reduce((s, p) => s + weeks[p], 0)
  const fractional = {}
  for (const p of DEVELOPMENT_ORDER) fractional[p] = raw[p] - Math.floor(raw[p])
  const byFractionalDesc = [...DEVELOPMENT_ORDER].sort((a, b) => fractional[b] - fractional[a])
  for (const p of byFractionalDesc) {
    if (remainder <= 0) break
    weeks[p]++
    remainder--
  }

  const boundaries = []
  let week = 1
  for (const p of DEVELOPMENT_ORDER) {
    boundaries.push({ phase: p, startWeek: week, endWeek: week + weeks[p] - 1, endFraction: PHASE_END_FRACTIONS[p] })
    week += weeks[p]
  }
  boundaries.push({ phase: 'taper', startWeek: week, endWeek: week, endFraction: PHASE_END_FRACTIONS.taper })
  week += 1
  boundaries.push({ phase: 'test', startWeek: week, endWeek: week, endFraction: PHASE_END_FRACTIONS.test })

  // Deload: longest development phase; >= (not >) on the scan makes a later
  // phase win ties, since fatigue matters most once it's accumulated.
  let deloadPhase = 'base'
  let maxLen = 0
  for (const p of DEVELOPMENT_ORDER) {
    if (weeks[p] >= maxLen) {
      maxLen = weeks[p]
      deloadPhase = p
    }
  }
  const deloadWeek = boundaries.find((b) => b.phase === deloadPhase).endWeek

  return { boundaries, deloadWeek }
}

/**
 * Minimum weeks to safely close the pace gap between current fitness and
 * goal, given the per-week safety cap, floored so base->build->peak->taper
 * adaptation has genuine time regardless of how small the gap is, and
 * ceilinged as a defensive bound against pathological inputs.
 */
export function computePlanLength(currentFitness5kSeconds, goalSeconds) {
  const currentPace = currentFitness5kSeconds / 5
  const goalPace = goalSeconds / 5
  if (goalPace >= currentPace) return PLAN_LENGTH_FLOOR_WEEKS
  const ratio = goalPace / currentPace
  const weeksNeeded = Math.ceil(Math.log(ratio) / Math.log(1 - MAX_WEEKLY_PACE_CHANGE))
  return clamp(weeksNeeded, PLAN_LENGTH_FLOOR_WEEKS, PLAN_LENGTH_CEILING_WEEKS)
}

export function phaseForWeek(week, totalWeeks) {
  const { boundaries } = buildPhaseTable(totalWeeks)
  const w = clamp(week, 1, totalWeeks)
  const boundary = boundaries.find((p) => w <= p.endWeek)
  return (boundary ?? boundaries[boundaries.length - 1]).phase
}

export function isDeloadWeek(week, totalWeeks) {
  return buildPhaseTable(totalWeeks).deloadWeek === week
}

export function volumeFactor(week, totalWeeks) {
  return isDeloadWeek(week, totalWeeks) ? DELOAD_VOLUME_FACTOR : 1
}

/**
 * The plan's original progress-toward-goal fraction at a given week (0 at
 * week 0, phase-boundary values from buildPhaseTable, linear within each
 * phase). Drives distance/volume progression, which follows the planned
 * ramp regardless of pace re-anchoring below.
 */
export function progressFraction(week, totalWeeks) {
  const { boundaries } = buildPhaseTable(totalWeeks)
  const w = clamp(week, 0, totalWeeks)
  if (w <= 0) return 0
  let prevEndWeek = 0
  let prevEndFraction = 0
  for (const p of boundaries) {
    if (w <= p.endWeek) {
      const span = p.endWeek - prevEndWeek
      const t = span > 0 ? (w - prevEndWeek) / span : 1
      return prevEndFraction + t * (p.endFraction - prevEndFraction)
    }
    prevEndWeek = p.endWeek
    prevEndFraction = p.endFraction
  }
  return boundaries[boundaries.length - 1].endFraction
}

export function paceForFraction(fraction) {
  return PLAN_START_5K_SECONDS / 5 - fraction * (PLAN_START_5K_SECONDS / 5 - PLAN_GOAL_5K_SECONDS / 5)
}

/**
 * Pace target (sec/km) for a given future week, re-anchored from the
 * athlete's actual current fitness rather than the original static plan.
 * Renormalizes the *remaining* portion of the original curve so "now" maps
 * to the athlete's real position and the final week still maps to goal
 * pace, capped so no single re-anchoring can demand more than
 * MAX_WEEKLY_PACE_CHANGE relative improvement per week. If the athlete is
 * behind, this honestly produces a slower (and thus a worse projected
 * finish time) trajectory rather than forcing the original numbers.
 */
export function anchorPaceForWeek(week, nowWeek, currentFitness5kSeconds, totalWeeks) {
  const currentPaceSecPerKm = currentFitness5kSeconds / 5
  const goalPaceSecPerKm = PLAN_GOAL_5K_SECONDS / 5

  if (week <= nowWeek) {
    return paceForFraction(progressFraction(week, totalWeeks))
  }

  const nowFraction = progressFraction(nowWeek, totalWeeks)
  const targetFraction = progressFraction(week, totalWeeks)
  const remainingSpan = 1 - nowFraction
  const renormalized = remainingSpan > 0 ? clamp((targetFraction - nowFraction) / remainingSpan, 0, 1) : 1

  const proposedPace = currentPaceSecPerKm - renormalized * (currentPaceSecPerKm - goalPaceSecPerKm)

  const weeksAhead = week - nowWeek
  const cappedFastestPace = currentPaceSecPerKm * Math.pow(1 - MAX_WEEKLY_PACE_CHANGE, weeksAhead)

  return Math.max(proposedPace, cappedFastestPace)
}
