const KM_METERS = 1000

/**
 * Computes per-km splits by linearly interpolating the timestamp at each
 * integer-km distance crossing. Requires points to have monotonically
 * non-decreasing cumulativeDistanceM already assigned.
 */
export function computeSplits(points) {
  if (points.length < 2) return []

  const splits = []
  const startMs = points[0].time.getTime()
  let nextBoundaryM = KM_METERS
  let prevSplitCumulativeSec = 0

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const distA = a.cumulativeDistanceM ?? 0
    const distB = b.cumulativeDistanceM ?? 0
    if (distB <= distA) continue

    while (nextBoundaryM <= distB) {
      const proportion = (nextBoundaryM - distA) / (distB - distA)
      const boundaryMs = a.time.getTime() + proportion * (b.time.getTime() - a.time.getTime())
      const cumulativeSec = (boundaryMs - startMs) / 1000
      const splitSec = cumulativeSec - prevSplitCumulativeSec
      splits.push({
        km: nextBoundaryM / KM_METERS,
        splitSec,
        paceSecPerKm: splitSec,
        cumulativeSec,
      })
      prevSplitCumulativeSec = cumulativeSec
      nextBoundaryM += KM_METERS
    }
  }

  const lastPoint = points[points.length - 1]
  const totalDistM = lastPoint.cumulativeDistanceM ?? 0
  const lastFullBoundaryM = nextBoundaryM - KM_METERS
  const partialDistM = totalDistM - lastFullBoundaryM
  if (partialDistM > 1) {
    const totalTimeSec = (lastPoint.time.getTime() - startMs) / 1000
    const partialSec = totalTimeSec - prevSplitCumulativeSec
    const partialKm = partialDistM / KM_METERS
    splits.push({
      km: lastFullBoundaryM / KM_METERS + partialKm,
      splitSec: partialSec,
      paceSecPerKm: partialSec / partialKm,
      cumulativeSec: totalTimeSec,
    })
  }

  return splits
}
