import { getAllCompletedRuns, hasAnyUnratedCompletedRun, updateCompletedRunRating } from './db'
import { computeRating, deriveExecutionFlags } from './analysis'

function deriveRating(run) {
  if (run.verdict === null || run.verdict === undefined) return null

  const prescription = JSON.parse(run.prescription_json)
  const analysisJson = run.analysis_json ? JSON.parse(run.analysis_json) : {}
  const fadePct = typeof analysisJson.fadePct === 'number' ? analysisJson.fadePct : null
  const { faded, shortfall } = deriveExecutionFlags(
    prescription,
    run.distance_km,
    run.target_distance_km,
    fadePct,
    analysisJson.detectedReps?.length ?? null
  )

  return computeRating(run.verdict, run.performance_vs_target_pct, faded, shortfall)
}

/** Ratings were added after some runs may already have been completed — fill those in once. */
export async function backfillMissingRatings(userId) {
  if (!(await hasAnyUnratedCompletedRun(userId))) return

  for (const run of await getAllCompletedRuns(userId)) {
    if (run.rating !== null) continue
    const rating = deriveRating(run)
    if (rating !== null) await updateCompletedRunRating(userId, run.id, rating)
  }
}
