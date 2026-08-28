import { haversineMeters, computeElevationGainM } from './geo'
import { computeSplits } from './splits'
import { parseGpx } from './gpx'
import { parseTcx } from './tcx'
import { analyzeIntervals } from './segments'

export function detectFormat(fileName) {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.tcx')) return 'tcx'
  if (lower.endsWith('.gpx')) return 'gpx'
  throw new Error('Unsupported file type: expected a .gpx or .tcx file')
}

function assignHaversineDistances(points) {
  let cumulative = 0
  return points.map((p, i) => {
    if (i > 0) {
      cumulative += haversineMeters(points[i - 1], p)
    }
    return { ...p, cumulativeDistanceM: cumulative }
  })
}

function avgOf(values) {
  if (values.length === 0) return null
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

// assignHaversineDistances (and TCX's own distance assignment) map points
// 1:1 preserving order, so re-slicing the final flat points array by each
// lap's original point count re-associates the distance-corrected points
// back into their lap groupings without relying on object identity.
function rebuildLaps(laps, finalPoints) {
  let idx = 0
  return laps.map((lap) => {
    const len = lap.points.length
    const slice = finalPoints.slice(idx, idx + len)
    idx += len
    return { ...lap, points: slice }
  })
}

export function parseRunFile(content, fileName) {
  const format = detectFormat(fileName)
  const parsed = format === 'gpx' ? parseGpx(content) : parseTcx(content)
  let points = parsed.points

  if (points.length < 2) {
    throw new Error('Run file has too few track points to analyze')
  }

  const hasDeviceDistance = points.every((p) => p.cumulativeDistanceM !== undefined)
  if (!hasDeviceDistance) {
    points = assignHaversineDistances(points)
  }
  const laps = rebuildLaps(parsed.laps, points)

  const lastPoint = points[points.length - 1]
  const distanceM = lastPoint.cumulativeDistanceM ?? 0
  const distanceKm = distanceM / 1000
  const durationSec = (lastPoint.time.getTime() - points[0].time.getTime()) / 1000

  if (distanceKm <= 0 || durationSec <= 0) {
    throw new Error('Run file does not contain a valid distance/duration')
  }

  const avgPaceSecPerKm = Math.round(durationSec / distanceKm)
  const elevationGainM = computeElevationGainM(points.map((p) => p.elevationM))
  const splits = computeSplits(points)
  const runDate = points[0].time.toISOString()

  const heartRates = points.map((p) => p.heartRateBpm).filter((h) => h !== undefined)
  const avgHeartRateBpm = avgOf(heartRates)
  const maxHeartRateBpm = heartRates.length > 0 ? Math.max(...heartRates) : null

  const intervalAnalysis = analyzeIntervals(points, laps)

  return {
    points,
    laps,
    distanceKm,
    durationSec: Math.round(durationSec),
    avgPaceSecPerKm,
    avgHeartRateBpm,
    maxHeartRateBpm,
    elevationGainM,
    splits,
    runDate,
    intervalAnalysis,
  }
}
