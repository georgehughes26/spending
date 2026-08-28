import { getMaxWeekNumber, insertPlanWeek, upsertPlannedRun } from './db'
import { anchorPaceForWeek, buildPhaseTable, computePlanLength, isDeloadWeek, paceForFraction, phaseForWeek, progressFraction } from './curve'
import {
  buildEasyPrescription,
  buildIntervalPrescription,
  buildTempoPrescription,
  buildTimeTrialPrescription,
  prescriptionTargetDistanceKm,
  prescriptionTargetPaceSecPerKm,
} from './prescriptions'

function addDays(date, days) {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10)
}

/** Every week is one long run + one interval + one tempo, except the final week, whose tempo slot becomes the goal-pace time trial. */
export function runTypesForWeek(week, totalWeeks) {
  return week === totalWeeks ? ['easy', 'interval', 'time_trial'] : ['easy', 'interval', 'tempo']
}

function weekContext(week, totalWeeks) {
  return {
    phase: phaseForWeek(week, totalWeeks),
    progressFraction: progressFraction(week, totalWeeks),
    isDeload: isDeloadWeek(week, totalWeeks),
  }
}

function buildPrescription(runType, ctx, anchorPaceSecPerKm) {
  switch (runType) {
    case 'easy':
      return buildEasyPrescription(ctx, anchorPaceSecPerKm)
    case 'tempo':
      return buildTempoPrescription(ctx, anchorPaceSecPerKm)
    case 'interval':
      return buildIntervalPrescription(ctx, anchorPaceSecPerKm)
    case 'time_trial':
      return buildTimeTrialPrescription()
    default:
      throw new Error(`Unknown run type: ${runType}`)
  }
}

async function writeWeekPrescriptions(userId, week, totalWeeks, anchorPaceSecPerKm) {
  const ctx = weekContext(week, totalWeeks)
  for (const runType of runTypesForWeek(week, totalWeeks)) {
    const prescription = buildPrescription(runType, ctx, anchorPaceSecPerKm)
    await upsertPlannedRun(userId, {
      week_number: week,
      run_type: runType,
      target_distance_km: prescriptionTargetDistanceKm(prescription),
      target_pace_sec_per_km: prescriptionTargetPaceSecPerKm(prescription),
      prescription_json: JSON.stringify(prescription),
    })
  }
}

/** Generates the full plan (dates + prescriptions) from scratch. Call once when setting up the plan. */
export async function generateFullPlan(userId, startDate, startFitness5kSeconds, goalSeconds) {
  const totalWeeks = computePlanLength(startFitness5kSeconds, goalSeconds)
  const { boundaries } = buildPhaseTable(totalWeeks)

  for (let week = 1; week <= totalWeeks; week++) {
    const weekStart = addDays(startDate, (week - 1) * 7)
    const weekEnd = addDays(weekStart, 6)
    const boundary = boundaries.find((b) => week >= b.startWeek && week <= b.endWeek)
    await insertPlanWeek(userId, {
      week_number: week,
      start_date: toIsoDate(weekStart),
      end_date: toIsoDate(weekEnd),
      phase: boundary.phase,
      is_deload: isDeloadWeek(week, totalWeeks),
    })
    // nowWeek === week here means anchorPaceForWeek returns the plain static
    // curve value for every week (no re-anchoring yet — there's no history).
    await writeWeekPrescriptions(userId, week, totalWeeks, paceForFraction(progressFraction(week, totalWeeks)))
  }
  return totalWeeks
}

/**
 * Recomputes prescriptions for every week from the athlete's current
 * demonstrated fitness. Only `status='upcoming'` rows actually change
 * (enforced by upsertPlannedRun's conflict guard) — completed weeks are
 * permanent history and are never rewritten. Reads the plan's current
 * length from the DB rather than a fixed constant, so it keeps working
 * unmodified regardless of how long the plan was sized to.
 */
export async function regenerateFuturePlan(userId, nowWeek, currentFitness5kSeconds) {
  const totalWeeks = await getMaxWeekNumber(userId)
  if (totalWeeks === 0) return
  for (let week = 1; week <= totalWeeks; week++) {
    await writeWeekPrescriptions(userId, week, totalWeeks, anchorPaceForWeek(week, nowWeek, currentFitness5kSeconds, totalWeeks))
  }
}
