import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

function arr(x) {
  if (x === undefined || x === null) return []
  return Array.isArray(x) ? x : [x]
}

function parseNumericValue(node) {
  if (node === undefined || node === null) return undefined
  const raw = typeof node === 'object' ? node.Value : node
  const n = parseFloat(String(raw))
  return Number.isNaN(n) ? undefined : n
}

/**
 * Parses a TCX file, preserving `<Lap>` boundaries — Garmin Connect writes
 * one lap per structured-workout step (warmup / work rep / recovery /
 * cooldown), which is the ground truth for interval segmentation when
 * present. When every point in the file carries a device DistanceMeters
 * reading, cumulativeDistanceM is populated from it (handling the common
 * case of per-lap distance resets by detecting backward jumps and
 * offsetting). Otherwise cumulativeDistanceM is left undefined so the
 * caller falls back to haversine distance for the whole run.
 */
export function parseTcx(xml) {
  const doc = parser.parse(xml)
  const tcd = doc.TrainingCenterDatabase
  if (!tcd) throw new Error('Not a valid TCX file: missing <TrainingCenterDatabase> root element')

  const activities = arr(tcd.Activities?.Activity)
  const rawLaps = []

  for (const activity of activities) {
    for (const lap of arr(activity.Lap)) {
      const rawPoints = []
      for (const track of arr(lap.Track)) {
        for (const tp of arr(track.Trackpoint)) {
          const timeStr = tp.Time
          const pos = tp.Position
          if (!timeStr || !pos) continue
          const lat = parseFloat(pos.LatitudeDegrees)
          const lon = parseFloat(pos.LongitudeDegrees)
          if (Number.isNaN(lat) || Number.isNaN(lon)) continue
          const ele = tp.AltitudeMeters !== undefined ? parseFloat(tp.AltitudeMeters) : undefined
          const dist = tp.DistanceMeters !== undefined ? parseFloat(tp.DistanceMeters) : undefined
          const hr = parseNumericValue(tp.HeartRateBpm)
          rawPoints.push({
            lat,
            lon,
            time: new Date(timeStr),
            elevationM: ele !== undefined && !Number.isNaN(ele) ? ele : undefined,
            heartRateBpm: hr,
            deviceDistM: dist !== undefined && !Number.isNaN(dist) ? dist : undefined,
          })
        }
      }
      const intensityRaw = typeof lap.Intensity === 'string' ? lap.Intensity.toLowerCase() : undefined
      rawLaps.push({
        points: rawPoints,
        distanceM: lap.DistanceMeters !== undefined ? parseFloat(lap.DistanceMeters) : undefined,
        durationSec: lap.TotalTimeSeconds !== undefined ? parseFloat(lap.TotalTimeSeconds) : undefined,
        intensity: intensityRaw === 'active' || intensityRaw === 'resting' ? intensityRaw : undefined,
        avgHeartRateBpm: parseNumericValue(lap.AverageHeartRateBpm),
        maxHeartRateBpm: parseNumericValue(lap.MaximumHeartRateBpm),
      })
    }
  }

  const allRawPoints = rawLaps.flatMap((l) => l.points)
  const allHaveDeviceDist = allRawPoints.length > 0 && allRawPoints.every((p) => p.deviceDistM !== undefined)

  const points = []
  const laps = []
  let baseOffset = 0
  let lastRaw
  let lastCumulative = 0

  for (const rawLap of rawLaps) {
    const lapPoints = []
    for (const p of rawLap.points) {
      let cumulativeDistanceM
      if (allHaveDeviceDist) {
        const raw = p.deviceDistM
        if (lastRaw !== undefined && raw < lastRaw - 1) {
          baseOffset = lastCumulative
        }
        cumulativeDistanceM = baseOffset + raw
        lastRaw = raw
        lastCumulative = cumulativeDistanceM
      }
      const point = {
        lat: p.lat,
        lon: p.lon,
        elevationM: p.elevationM,
        heartRateBpm: p.heartRateBpm,
        time: p.time,
        cumulativeDistanceM,
      }
      points.push(point)
      lapPoints.push(point)
    }
    if (lapPoints.length > 0) {
      laps.push({
        points: lapPoints,
        distanceM: rawLap.distanceM,
        durationSec: rawLap.durationSec,
        intensity: rawLap.intensity,
        avgHeartRateBpm: rawLap.avgHeartRateBpm,
        maxHeartRateBpm: rawLap.maxHeartRateBpm,
      })
    }
  }

  return { points, laps }
}
