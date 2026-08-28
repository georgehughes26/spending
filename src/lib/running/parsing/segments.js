const MIN_WORK_SEGMENTS = 2
const MAX_PLAUSIBLE_PACE_SEC_PER_KM = 1200
const BUCKET_SEC = 20
const MIN_REP_DURATION_SEC = 20
const MIN_BIMODAL_GAP_SEC_PER_KM = 20

function pointsDistanceM(points) {
  const first = points[0]?.cumulativeDistanceM
  const last = points[points.length - 1]?.cumulativeDistanceM
  if (first === undefined || last === undefined) return 0
  return Math.max(0, last - first)
}

function pointsDurationSec(points) {
  if (points.length < 2) return 0
  return (points[points.length - 1].time.getTime() - points[0].time.getTime()) / 1000
}

function lapDistanceM(lap) {
  return lap.distanceM ?? pointsDistanceM(lap.points)
}

function lapDurationSec(lap) {
  return lap.durationSec ?? pointsDurationSec(lap.points)
}

function lapPaceSecPerKm(lap) {
  const distM = lapDistanceM(lap)
  const durSec = lapDurationSec(lap)
  if (distM <= 1) return MAX_PLAUSIBLE_PACE_SEC_PER_KM
  return Math.min(MAX_PLAUSIBLE_PACE_SEC_PER_KM, durSec / (distM / 1000))
}

function avgOf(values) {
  if (values.length === 0) return undefined
  return values.reduce((a, b) => a + b, 0) / values.length
}

function lapAvgHeartRate(lap) {
  if (lap.avgHeartRateBpm !== undefined) return lap.avgHeartRateBpm
  return avgOf(lap.points.map((p) => p.heartRateBpm).filter((h) => h !== undefined))
}

function toRep(lap, index) {
  return {
    index,
    distanceM: lapDistanceM(lap),
    durationSec: lapDurationSec(lap),
    avgPaceSecPerKm: lapPaceSecPerKm(lap),
    avgHeartRateBpm: lapAvgHeartRate(lap),
  }
}

function toRest(lap) {
  return {
    distanceM: lapDistanceM(lap),
    durationSec: lapDurationSec(lap),
    avgPaceSecPerKm: lapPaceSecPerKm(lap),
  }
}

function computeFadePct(reps) {
  if (reps.length < 2) return null
  const mid = Math.max(1, Math.floor(reps.length / 2))
  const firstHalf = reps.slice(0, mid)
  const secondHalf = reps.slice(mid)
  if (firstHalf.length === 0 || secondHalf.length === 0) return null
  const firstAvg = avgOf(firstHalf.map((r) => r.avgPaceSecPerKm))
  const secondAvg = avgOf(secondHalf.map((r) => r.avgPaceSecPerKm))
  if (firstAvg <= 0) return null
  return (secondAvg - firstAvg) / firstAvg
}

function buildAnalysis(workReps, restSegments, tier) {
  if (workReps.length < MIN_WORK_SEGMENTS) return null
  const workDistanceM = workReps.reduce((s, r) => s + r.distanceM, 0)
  const workDurationSec = workReps.reduce((s, r) => s + r.durationSec, 0)
  if (workDistanceM <= 0 || workDurationSec <= 0) return null
  return {
    reps: workReps,
    restSegments,
    workDistanceKm: workDistanceM / 1000,
    workDurationSec,
    workAvgPaceSecPerKm: Math.round(workDurationSec / (workDistanceM / 1000)),
    segmentationTier: tier,
    fadePct: computeFadePct(workReps),
  }
}

// Garmin Connect structured workouts always start with a warmup step and end
// with a cooldown step, both typically labeled the same "Active" intensity
// as the work reps themselves — left in, they'd dilute the work-pace average
// with slow warmup/cooldown laps. With enough laps to spare, treat the first
// and last as warmup/cooldown and exclude them from work/rest classification.
function interiorLaps(laps) {
  return laps.length >= 5 ? laps.slice(1, -1) : laps
}

/** Tier 1: trust lap Intensity, but only if resting laps are actually meaningfully slower than active laps. */
function tryTierOne(allLaps) {
  const laps = interiorLaps(allLaps)
  if (laps.length < 3 || !laps.every((l) => l.intensity !== undefined)) return null
  const active = laps.filter((l) => l.intensity === 'active')
  const resting = laps.filter((l) => l.intensity === 'resting')
  if (active.length < MIN_WORK_SEGMENTS || resting.length === 0) return null

  const activeAvgPace = avgOf(active.map(lapPaceSecPerKm))
  const restingAvgPace = avgOf(resting.map(lapPaceSecPerKm))
  if (!(restingAvgPace > activeAvgPace * 1.1)) return null // self-validation: Intensity should mean something

  return buildAnalysis(
    active.map((l, i) => toRep(l, i + 1)),
    resting.map(toRest),
    1
  )
}

/** Tier 2: multiple laps, no usable Intensity — split at the largest pace gap between laps. */
function tryTierTwo(allLaps) {
  const laps = interiorLaps(allLaps)
  if (laps.length < 3) return null
  const withPace = laps.map((l) => ({ lap: l, pace: lapPaceSecPerKm(l) }))
  const sorted = [...withPace].sort((a, b) => a.pace - b.pace)

  let maxGap = 0
  let gapIdx = -1
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].pace - sorted[i].pace
    if (gap > maxGap) {
      maxGap = gap
      gapIdx = i
    }
  }
  if (gapIdx < 0 || maxGap < MIN_BIMODAL_GAP_SEC_PER_KM) return null

  const threshold = (sorted[gapIdx].pace + sorted[gapIdx + 1].pace) / 2
  const work = laps.filter((l) => lapPaceSecPerKm(l) <= threshold)
  const rest = laps.filter((l) => lapPaceSecPerKm(l) > threshold)
  if (work.length < MIN_WORK_SEGMENTS || rest.length === 0) return null

  return buildAnalysis(
    work.map((l, i) => toRep(l, i + 1)),
    rest.map(toRest),
    2
  )
}

function resampleByTime(points, stepSec) {
  if (points.length < 2) return []
  const startMs = points[0].time.getTime()
  const totalSec = (points[points.length - 1].time.getTime() - startMs) / 1000
  let pIdx = 0

  function stateAtSec(targetSec) {
    const targetMs = startMs + targetSec * 1000
    while (pIdx < points.length - 2 && points[pIdx + 1].time.getTime() < targetMs) pIdx++
    const a = points[pIdx]
    const b = points[Math.min(pIdx + 1, points.length - 1)]
    const aDist = a.cumulativeDistanceM ?? 0
    const bDist = b.cumulativeDistanceM ?? aDist
    const aMs = a.time.getTime()
    const bMs = b.time.getTime()
    const proportion = bMs <= aMs ? 0 : Math.min(1, Math.max(0, (targetMs - aMs) / (bMs - aMs)))
    return { distM: aDist + proportion * (bDist - aDist), hr: a.heartRateBpm }
  }

  const buckets = []
  let prevSec = 0
  let prevState = stateAtSec(0)
  const hrSamples = points[0].heartRateBpm !== undefined ? [points[0].heartRateBpm] : []

  for (let sec = stepSec; sec <= totalSec + 0.001; sec += stepSec) {
    const clippedSec = Math.min(sec, totalSec)
    const state = stateAtSec(clippedSec)
    const deltaDist = state.distM - prevState.distM
    const deltaSec = clippedSec - prevSec
    if (deltaSec > 0.5) {
      const paceSecPerKm = deltaDist > 0.5 ? Math.min(MAX_PLAUSIBLE_PACE_SEC_PER_KM, deltaSec / (deltaDist / 1000)) : MAX_PLAUSIBLE_PACE_SEC_PER_KM
      buckets.push({ durationSec: deltaSec, distanceM: deltaDist, paceSecPerKm, avgHeartRateBpm: avgOf(hrSamples) })
    }
    hrSamples.length = 0
    prevSec = clippedSec
    prevState = state
    if (clippedSec >= totalSec) break
  }
  return buckets
}

function kmeans1D(values, iterations = 25) {
  const sorted = [...values].sort((a, b) => a - b)
  let centroids = [sorted[Math.floor(sorted.length * 0.25)], sorted[Math.floor(sorted.length * 0.75)]]
  for (let iter = 0; iter < iterations; iter++) {
    const sums = [0, 0]
    const counts = [0, 0]
    for (const v of values) {
      const c = Math.abs(v - centroids[0]) <= Math.abs(v - centroids[1]) ? 0 : 1
      sums[c] += v
      counts[c]++
    }
    const next = [
      counts[0] > 0 ? sums[0] / counts[0] : centroids[0],
      counts[1] > 0 ? sums[1] / counts[1] : centroids[1],
    ]
    if (Math.abs(next[0] - centroids[0]) < 0.01 && Math.abs(next[1] - centroids[1]) < 0.01) {
      centroids = next
      break
    }
    centroids = next
  }
  return centroids[0] <= centroids[1] ? centroids : [centroids[1], centroids[0]]
}

/** Tier 3: single lap (or no lap structure) — resample into time buckets and pace-cluster them. */
function tryTierThree(points) {
  const buckets = resampleByTime(points, BUCKET_SEC)
  if (buckets.length < 4) return null

  const [fastCentroid, slowCentroid] = kmeans1D(buckets.map((b) => b.paceSecPerKm))
  if (slowCentroid - fastCentroid < MIN_BIMODAL_GAP_SEC_PER_KM) return null
  const threshold = (fastCentroid + slowCentroid) / 2

  const segments = []
  for (const b of buckets) {
    const label = b.paceSecPerKm <= threshold ? 'work' : 'rest'
    const last = segments[segments.length - 1]
    if (last && last.label === label) {
      last.distanceM += b.distanceM
      last.durationSec += b.durationSec
      if (b.avgHeartRateBpm !== undefined) last.hrSamples.push(b.avgHeartRateBpm)
    } else {
      segments.push({
        label,
        distanceM: b.distanceM,
        durationSec: b.durationSec,
        hrSamples: b.avgHeartRateBpm !== undefined ? [b.avgHeartRateBpm] : [],
      })
    }
  }

  const workReps = []
  const restSegments = []
  for (const seg of segments) {
    if (seg.label === 'work' && seg.durationSec >= MIN_REP_DURATION_SEC && seg.distanceM > 0) {
      workReps.push({
        index: workReps.length + 1,
        distanceM: seg.distanceM,
        durationSec: seg.durationSec,
        avgPaceSecPerKm: seg.durationSec / (seg.distanceM / 1000),
        avgHeartRateBpm: avgOf(seg.hrSamples),
      })
    } else if (seg.label === 'rest') {
      restSegments.push({
        distanceM: seg.distanceM,
        durationSec: seg.durationSec,
        avgPaceSecPerKm: seg.distanceM > 0.5 ? seg.durationSec / (seg.distanceM / 1000) : MAX_PLAUSIBLE_PACE_SEC_PER_KM,
      })
    }
    // Short "work" blips under MIN_REP_DURATION_SEC are dropped as noise.
  }

  return buildAnalysis(workReps, restSegments, 3)
}

export function analyzeIntervals(points, laps) {
  if (laps.length > 1) {
    return tryTierOne(laps) ?? tryTierTwo(laps) ?? tryTierThree(points)
  }
  return tryTierThree(points)
}
