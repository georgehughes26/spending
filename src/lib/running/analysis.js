import {
  AHEAD_THRESHOLD_NO_HR,
  AHEAD_THRESHOLD_WITH_HR,
  BEHIND_THRESHOLD,
  EASY_COMFORT_DISTANCE_RATIO,
  EASY_PACE_RATIO,
  FADE_THRESHOLD,
  FITNESS_EMA_ALPHA,
  FITNESS_UPDATE_CLAMP,
  HR_ROOM_TO_PUSH_FACTOR,
  INTERVAL_SPEC_BY_PHASE,
  LOCAL_EASY_DISTANCE_MIN_KM,
  LOCAL_EASY_DISTANCE_STEP_DOWN_KM,
  LOCAL_EASY_DISTANCE_STEP_UP_KM,
  LOCAL_INTERVAL_PACE_NUDGE,
  LOCAL_TEMPO_CORE_MIN_KM,
  LOCAL_TEMPO_DISTANCE_STEP_KM,
  ON_TRACK_BAND,
  PLAUSIBLE_5K_PACE_RANGE_SEC,
  TEMPO_PACE_RATIO,
} from './constants'
import { phaseForWeek } from './curve'
import { prescriptionTargetDistanceKm } from './prescriptions'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function paceRatioForPlannedRun(runType, weekNumber, totalWeeks) {
  switch (runType) {
    case 'easy':
      return EASY_PACE_RATIO
    case 'tempo':
      return TEMPO_PACE_RATIO
    case 'interval':
      return INTERVAL_SPEC_BY_PHASE[phaseForWeek(weekNumber, totalWeeks)].paceRatio
    case 'time_trial':
      return 1
    default:
      return 1
  }
}

/** Points per 1% of pace margin off the 50 anchor — shared by the score and its breakdown. */
const RATING_POINTS_PER_PCT = 400
const RATING_FADE_PENALTY = 15
const RATING_SHORTFALL_PENALTY = 20

/**
 * A 0-100 execution score. 50 is the "followed it to the second" anchor —
 * dead on the prescribed pace, verdict on_track, no fade or shortfall.
 * Every percentage point of pace margin moves the score away from that
 * anchor (faster => toward 100, slower => toward 0); verdict then clamps
 * the result into the right half so the number never contradicts the
 * ahead/on_track/behind label, and fade/shortfall pull it down further for
 * poor execution even on an otherwise fast run.
 */
export function computeRatingBreakdown(verdict, performanceVsTargetPct, faded, shortfall) {
  if (verdict === 'inconclusive') return null

  let afterPaceMargin = 50 - performanceVsTargetPct * RATING_POINTS_PER_PCT
  if (verdict === 'ahead') afterPaceMargin = Math.max(afterPaceMargin, 55)
  else if (verdict === 'behind') afterPaceMargin = Math.min(afterPaceMargin, 45)
  else afterPaceMargin = clamp(afterPaceMargin, 35, 65)
  afterPaceMargin = Math.round(afterPaceMargin)

  let afterPenalties = afterPaceMargin
  if (faded) afterPenalties -= RATING_FADE_PENALTY
  if (shortfall) afterPenalties -= RATING_SHORTFALL_PENALTY

  const final = Math.round(clamp(afterPenalties, 0, 100))

  return { verdict, performanceVsTargetPct, afterPaceMargin, faded, shortfall, afterPenalties, final }
}

export function computeRating(verdict, performanceVsTargetPct, faded, shortfall) {
  return computeRatingBreakdown(verdict, performanceVsTargetPct, faded, shortfall)?.final ?? null
}

/** Shared faded/shortfall derivation for a stored completed run — used by the rating
 * backfill/migration and by the history page's score breakdown, so both agree with
 * what analyzeCompletedRun computed at upload time. */
export function deriveExecutionFlags(prescription, distanceKm, targetDistanceKm, fadePct, detectedRepsCount) {
  const faded = fadePct !== null && fadePct > FADE_THRESHOLD
  const shortfall =
    prescription.kind === 'interval'
      ? (detectedRepsCount ?? 0) < prescription.reps.length
      : distanceKm < targetDistanceKm * 0.85
  return { faded, shortfall }
}

function fadeFlag(parsed) {
  const fadePct = parsed.intervalAnalysis?.fadePct ?? null
  return { faded: fadePct !== null && fadePct > FADE_THRESHOLD, fadePct }
}

function repShortfall(parsed, prescription) {
  if (prescription.kind !== 'interval') return false
  const completed = parsed.intervalAnalysis?.reps.length ?? 0
  return completed < prescription.reps.length
}

function distanceShortfall(parsed, targetDistanceKm, toleranceRatio = 0.85) {
  return parsed.distanceKm < targetDistanceKm * toleranceRatio
}

export function analyzeCompletedRun(parsed, plannedRun, profile, totalWeeks) {
  const prescription = plannedRun.prescription_json
  const runType = plannedRun.run_type
  const targetPaceSecPerKm = plannedRun.target_pace_sec_per_km ?? 0
  const targetDistanceKm = plannedRun.target_distance_km
  const reasoning = []

  const usedWorkPace = runType === 'interval' && parsed.intervalAnalysis !== null
  const workAvgPaceSecPerKm = usedWorkPace ? parsed.intervalAnalysis.workAvgPaceSecPerKm : parsed.avgPaceSecPerKm
  if (runType === 'interval' && !usedWorkPace) {
    reasoning.push("Couldn't detect distinct work/rest reps in this file, so judged it on the whole-run average pace instead.")
  }

  const performanceVsTargetPct = targetPaceSecPerKm > 0 ? (workAvgPaceSecPerKm - targetPaceSecPerKm) / targetPaceSecPerKm : 0

  const ratio = paceRatioForPlannedRun(runType, plannedRun.week_number, totalWeeks)
  const impliedFitnessPaceSecPerKm = workAvgPaceSecPerKm / ratio
  const [minPlausible, maxPlausible] = PLAUSIBLE_5K_PACE_RANGE_SEC
  const excludedFromFitness = impliedFitnessPaceSecPerKm < minPlausible || impliedFitnessPaceSecPerKm > maxPlausible

  let newFitness5kEquivSeconds = profile.current_fitness_5k_equiv_seconds
  if (excludedFromFitness) {
    reasoning.push("This run's pace looked implausible, so it was excluded from your fitness estimate.")
  } else {
    const impliedFitness5kSeconds = impliedFitnessPaceSecPerKm * 5
    const alpha = FITNESS_EMA_ALPHA[runType]
    const blended = profile.current_fitness_5k_equiv_seconds * (1 - alpha) + impliedFitness5kSeconds * alpha
    const maxDelta = FITNESS_UPDATE_CLAMP * profile.current_fitness_5k_equiv_seconds
    const delta = clamp(blended - profile.current_fitness_5k_equiv_seconds, -maxDelta, maxDelta)
    newFitness5kEquivSeconds = Math.round(profile.current_fitness_5k_equiv_seconds + delta)
  }

  const shortfall =
    (runType === 'interval' && repShortfall(parsed, prescription)) ||
    (runType !== 'interval' && distanceShortfall(parsed, targetDistanceKm))

  let verdict
  if (excludedFromFitness) {
    verdict = 'inconclusive'
  } else if (shortfall) {
    verdict = 'behind'
    reasoning.push(
      runType === 'interval'
        ? "Didn't complete all the prescribed reps."
        : `Covered ${parsed.distanceKm.toFixed(1)}km against a ${targetDistanceKm}km target.`
    )
  } else if (performanceVsTargetPct > BEHIND_THRESHOLD) {
    verdict = 'behind'
    reasoning.push(
      `Averaged ${Math.round(workAvgPaceSecPerKm)} sec/km vs a ${targetPaceSecPerKm} sec/km target (${(performanceVsTargetPct * 100).toFixed(1)}% slower).`
    )
  } else if (performanceVsTargetPct < -ON_TRACK_BAND) {
    const hasHr = parsed.avgHeartRateBpm !== null && profile.observed_max_hr_bpm !== null
    const roomToPush =
      hasHr && parsed.avgHeartRateBpm !== null && profile.observed_max_hr_bpm !== null
        ? parsed.avgHeartRateBpm < profile.observed_max_hr_bpm * HR_ROOM_TO_PUSH_FACTOR
        : false
    const aheadThreshold = hasHr && roomToPush ? AHEAD_THRESHOLD_WITH_HR : AHEAD_THRESHOLD_NO_HR
    if (-performanceVsTargetPct > aheadThreshold && !shortfall) {
      verdict = 'ahead'
      reasoning.push(
        `Averaged ${Math.round(workAvgPaceSecPerKm)} sec/km vs a ${targetPaceSecPerKm} sec/km target (${(-performanceVsTargetPct * 100).toFixed(1)}% faster)${roomToPush ? ', with room to spare on heart rate' : ''}.`
      )
    } else {
      verdict = 'on_track'
    }
  } else {
    verdict = 'on_track'
  }
  if (verdict === 'on_track') reasoning.push('Right on target — no changes needed.')

  const localNudge = excludedFromFitness ? null : computeLocalNudge(parsed, prescription, performanceVsTargetPct, reasoning)
  const rating = computeRating(verdict, performanceVsTargetPct, fadeFlag(parsed).faded, shortfall)

  const analysisJson = {
    usedWorkPace,
    workAvgPaceSecPerKm,
    performanceVsTargetPct,
    fadePct: fadeFlag(parsed).fadePct,
    segmentationTier: parsed.intervalAnalysis?.segmentationTier ?? null,
    detectedReps: parsed.intervalAnalysis?.reps ?? null,
    restSegments: parsed.intervalAnalysis?.restSegments ?? null,
    avgHeartRateBpm: parsed.avgHeartRateBpm,
    maxHeartRateBpm: parsed.maxHeartRateBpm,
    reasoning,
  }

  return {
    verdict,
    workAvgPaceSecPerKm,
    performanceVsTargetPct,
    excludedFromFitness,
    newFitness5kEquivSeconds,
    localNudge,
    reasoning,
    analysisJson,
    rating,
  }
}

function computeLocalNudge(parsed, prescription, performanceVsTargetPct, reasoning) {
  if (prescription.kind === 'interval') {
    const { faded } = fadeFlag(parsed)
    const shortfall = repShortfall(parsed, prescription)
    if (faded || shortfall) {
      reasoning.push(
        faded
          ? 'Paced faded noticeably from your first reps to your last — easing next session\'s target slightly.'
          : 'Fewer reps completed than prescribed — easing next session\'s target slightly.'
      )
      return { type: 'interval_pace', multiplier: 1 + LOCAL_INTERVAL_PACE_NUDGE }
    }
    return null
  }

  if (prescription.kind === 'tempo') {
    const targetTotalKm = prescriptionTargetDistanceKm(prescription)
    const comfortable = parsed.distanceKm >= targetTotalKm && performanceVsTargetPct <= 0
    const struggled = distanceShortfall(parsed, targetTotalKm) || performanceVsTargetPct > BEHIND_THRESHOLD
    if (comfortable) {
      reasoning.push(`Covered the full ${targetTotalKm}km at or ahead of target pace — stretching next tempo's distance.`)
      return { type: 'tempo_distance', deltaKm: LOCAL_TEMPO_DISTANCE_STEP_KM }
    }
    if (struggled) {
      reasoning.push("Tempo run was tougher than planned — trimming next tempo's distance.")
      return { type: 'tempo_distance', deltaKm: -LOCAL_TEMPO_DISTANCE_STEP_KM }
    }
    return null
  }

  if (prescription.kind === 'easy') {
    const comfortable = parsed.distanceKm >= prescription.distanceKm * EASY_COMFORT_DISTANCE_RATIO && performanceVsTargetPct <= 0
    const struggled = distanceShortfall(parsed, prescription.distanceKm) && performanceVsTargetPct > 0.1
    if (comfortable) {
      reasoning.push(`Covered ${parsed.distanceKm.toFixed(1)}km comfortably (target was ${prescription.distanceKm}km) — bumping next easy run's distance.`)
      return { type: 'easy_distance', deltaKm: LOCAL_EASY_DISTANCE_STEP_UP_KM }
    }
    if (struggled) {
      reasoning.push("Easy run was harder than it should've been — easing next easy run's distance.")
      return { type: 'easy_distance', deltaKm: -LOCAL_EASY_DISTANCE_STEP_DOWN_KM }
    }
    return null
  }

  return null
}

/** Pure function: applies a local nudge to a prescription, returning a new prescription object. */
export function applyNudgeToPrescription(prescription, nudge) {
  if (nudge.type === 'interval_pace' && prescription.kind === 'interval') {
    return {
      ...prescription,
      reps: prescription.reps.map((r) => {
        const oldRepDurationSec = (r.distanceM / 1000) * r.targetPaceSecPerKm
        const recoveryRatio = oldRepDurationSec > 0 ? r.recoverySec / oldRepDurationSec : 1
        const newPace = Math.round(r.targetPaceSecPerKm * nudge.multiplier)
        const newRepDurationSec = (r.distanceM / 1000) * newPace
        return { ...r, targetPaceSecPerKm: newPace, recoverySec: Math.round(newRepDurationSec * recoveryRatio) }
      }),
    }
  }
  if (nudge.type === 'tempo_distance' && prescription.kind === 'tempo') {
    const newCore = Math.max(LOCAL_TEMPO_CORE_MIN_KM, Math.round((prescription.coreKm + nudge.deltaKm) * 10) / 10)
    return { ...prescription, coreKm: newCore }
  }
  if (nudge.type === 'easy_distance' && prescription.kind === 'easy') {
    const newDistance = Math.max(LOCAL_EASY_DISTANCE_MIN_KM, Math.round((prescription.distanceKm + nudge.deltaKm) * 10) / 10)
    return { ...prescription, distanceKm: newDistance }
  }
  return prescription
}
