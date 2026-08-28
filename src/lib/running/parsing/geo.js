const EARTH_RADIUS_M = 6371000
const ELEVATION_NOISE_THRESHOLD_M = 1

function toRad(deg) {
  return (deg * Math.PI) / 180
}

export function haversineMeters(a, b) {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, h)))
}

export function computeElevationGainM(elevations) {
  const known = elevations.filter((e) => e !== undefined)
  if (known.length < 2) return null
  let gain = 0
  for (let i = 1; i < known.length; i++) {
    const delta = known[i] - known[i - 1]
    if (delta > ELEVATION_NOISE_THRESHOLD_M) gain += delta
  }
  return gain
}
