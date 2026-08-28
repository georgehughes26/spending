import { parseRunFile } from './parsing'
import { getCurrentWeekNumber, getPlannedRunsForWeek, updateProfile } from './db'
import { regenerateFuturePlan } from './generate'
import { EASY_PACE_RATIO, FITNESS_EMA_ALPHA, INTERVAL_SPEC_BY_PHASE, PLAUSIBLE_5K_PACE_RANGE_SEC, TEMPO_PACE_RATIO } from './constants'

export function ratioForRepDistance(distanceM) {
  let best = INTERVAL_SPEC_BY_PHASE.base.paceRatio
  let bestDiff = Infinity
  for (const spec of Object.values(INTERVAL_SPEC_BY_PHASE)) {
    const diff = Math.abs(spec.repDistanceM - distanceM)
    if (diff < bestDiff) {
      bestDiff = diff
      best = spec.paceRatio
    }
  }
  return best
}

/** Pure weighted blend, exported separately from the DB-touching orchestration below for testability. */
export function blendImpliedFitness(entries) {
  const totalWeight = entries.reduce((s, e) => s + e.weight, 0)
  const blended = entries.reduce((s, e) => s + e.impliedFitness5kSeconds * (e.weight / totalWeight), 0)
  return Math.round(blended)
}

/**
 * Sets the starting fitness estimate from up to 3 already-completed runs
 * (typically from before the plan existed), without touching any plan week
 * or slot — this is a one-time "where am I actually starting from" input,
 * distinct from uploading a run that fulfills a specific prescribed week.
 */
export async function calibrateFromRuns(userId, input) {
  const [minPlausible, maxPlausible] = PLAUSIBLE_5K_PACE_RANGE_SEC
  const used = []
  const excluded = []

  if (input.easy) {
    const parsed = parseRunFile(input.easy.content, input.easy.fileName)
    const impliedPace = parsed.avgPaceSecPerKm / EASY_PACE_RATIO
    if (impliedPace < minPlausible || impliedPace > maxPlausible) {
      excluded.push({ label: 'easy', reason: 'Implied pace looked implausible.' })
    } else {
      used.push({ label: 'easy', weight: FITNESS_EMA_ALPHA.easy, impliedFitness5kSeconds: impliedPace * 5 })
    }
  }

  if (input.tempo) {
    const parsed = parseRunFile(input.tempo.content, input.tempo.fileName)
    const impliedPace = parsed.avgPaceSecPerKm / TEMPO_PACE_RATIO
    if (impliedPace < minPlausible || impliedPace > maxPlausible) {
      excluded.push({ label: 'tempo', reason: 'Implied pace looked implausible.' })
    } else {
      used.push({ label: 'tempo', weight: FITNESS_EMA_ALPHA.tempo, impliedFitness5kSeconds: impliedPace * 5 })
    }
  }

  if (input.interval) {
    const parsed = parseRunFile(input.interval.content, input.interval.fileName)
    const workPace = parsed.intervalAnalysis?.workAvgPaceSecPerKm ?? parsed.avgPaceSecPerKm
    const repDistanceM = parsed.intervalAnalysis?.reps[0]?.distanceM ?? 400
    const ratio = ratioForRepDistance(repDistanceM)
    const impliedPace = workPace / ratio
    if (impliedPace < minPlausible || impliedPace > maxPlausible) {
      excluded.push({ label: 'interval', reason: 'Implied pace looked implausible.' })
    } else {
      used.push({ label: 'interval', weight: FITNESS_EMA_ALPHA.interval, impliedFitness5kSeconds: impliedPace * 5 })
    }
  }

  if (used.length === 0) {
    throw new Error('None of the provided runs produced a usable fitness estimate.')
  }

  const newFitness5kEquivSeconds = blendImpliedFitness(used)

  await updateProfile(userId, { current_fitness_5k_equiv_seconds: newFitness5kEquivSeconds })

  // If the current week hasn't actually been run yet, treat "now" as before
  // it starts so its own targets get rebased too — otherwise regeneration
  // would leave the current week frozen at its stale pre-calibration values
  // (correct behavior for a normal upload mid-plan, wrong for a pre-start
  // calibration where nothing has been completed at all).
  const currentWeek = (await getCurrentWeekNumber(userId)) ?? 1
  const currentWeekRuns = await getPlannedRunsForWeek(userId, currentWeek)
  const currentWeekHasCompletedRun = currentWeekRuns.some((r) => r.status === 'completed')
  const nowWeek = currentWeekHasCompletedRun ? currentWeek : currentWeek - 1
  await regenerateFuturePlan(userId, nowWeek, newFitness5kEquivSeconds)

  return {
    newFitness5kEquivSeconds,
    used: used.map((u) => ({ label: u.label, impliedFitness5kSeconds: Math.round(u.impliedFitness5kSeconds) })),
    excluded,
  }
}
