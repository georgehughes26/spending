import { parseRunFile, detectFormat } from './parsing'
import {
  getCurrentWeekNumber,
  getMaxWeekNumber,
  getNextUpcomingByType,
  getPlannedRunById,
  getProfile,
  insertCompletedRun,
  insertFitnessHistory,
  markPlannedRunCompleted,
  updatePlannedRunPrescription,
  updateProfile,
} from './db'
import { analyzeCompletedRun, applyNudgeToPrescription } from './analysis'
import { regenerateFuturePlan } from './generate'
import { prescriptionTargetDistanceKm, prescriptionTargetPaceSecPerKm } from './prescriptions'

export async function processRunUpload(userId, content, fileName, plannedRunId) {
  const sourceFormat = detectFormat(fileName)
  const parsed = parseRunFile(content, fileName)

  const plannedRun = await getPlannedRunById(userId, plannedRunId)
  if (!plannedRun) throw new Error('Planned run not found')
  if (plannedRun.status !== 'upcoming') throw new Error('This planned run has already been completed')

  const profile = await getProfile(userId)
  const totalWeeks = await getMaxWeekNumber(userId)
  const analysis = analyzeCompletedRun(parsed, plannedRun, profile, totalWeeks)

  const completedRun = await insertCompletedRun(userId, {
    planned_run_id: plannedRun.id,
    source_file_name: fileName,
    source_format: sourceFormat,
    run_date: parsed.runDate.slice(0, 10),
    distance_km: parsed.distanceKm,
    duration_sec: parsed.durationSec,
    avg_pace_sec_per_km: parsed.avgPaceSecPerKm,
    avg_heart_rate_bpm: parsed.avgHeartRateBpm,
    max_heart_rate_bpm: parsed.maxHeartRateBpm,
    elevation_gain_m: parsed.elevationGainM,
    splits_json: JSON.stringify(parsed.splits),
    raw_trackpoints_json: JSON.stringify(
      parsed.points.map((p) => ({ lat: p.lat, lon: p.lon, t: p.time.toISOString(), ele: p.elevationM, hr: p.heartRateBpm }))
    ),
    analysis_json: JSON.stringify(analysis.analysisJson),
    verdict: analysis.verdict,
    rating: analysis.rating,
    performance_vs_target_pct: analysis.performanceVsTargetPct,
    excluded_from_fitness: analysis.excludedFromFitness,
  })

  await markPlannedRunCompleted(userId, plannedRun.id)

  if (!analysis.excludedFromFitness) {
    await updateProfile(userId, { current_fitness_5k_equiv_seconds: analysis.newFitness5kEquivSeconds })
    await insertFitnessHistory(userId, completedRun.id, analysis.newFitness5kEquivSeconds)
  }

  const nowWeek = (await getCurrentWeekNumber(userId)) ?? plannedRun.week_number
  await regenerateFuturePlan(userId, nowWeek, analysis.newFitness5kEquivSeconds)

  if (analysis.localNudge) {
    const nextSameType = await getNextUpcomingByType(userId, plannedRun.run_type, plannedRun.week_number)
    if (nextSameType) {
      const currentPrescription = JSON.parse(nextSameType.prescription_json)
      const nudged = applyNudgeToPrescription(currentPrescription, analysis.localNudge)
      await updatePlannedRunPrescription(userId, nextSameType.id, {
        target_distance_km: prescriptionTargetDistanceKm(nudged),
        target_pace_sec_per_km: prescriptionTargetPaceSecPerKm(nudged),
        prescription_json: JSON.stringify(nudged),
      })
    }
  }

  return {
    completedRunId: completedRun.id,
    verdict: analysis.verdict,
    rating: analysis.rating,
    reasoning: analysis.reasoning,
    previousFitness5kEquivSeconds: profile.current_fitness_5k_equiv_seconds,
    newFitness5kEquivSeconds: analysis.newFitness5kEquivSeconds,
  }
}
