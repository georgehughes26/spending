import { XMLParser } from 'fast-xml-parser'

// removeNSPrefix strips namespace prefixes (gpxtpx:, ns3:, etc.) so heart-rate
// extensions parse consistently regardless of which prefix alias a given
// exporter happens to declare for the TrackPointExtension namespace.
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true })

function arr(x) {
  if (x === undefined || x === null) return []
  return Array.isArray(x) ? x : [x]
}

function findHeartRate(node, depth = 0) {
  if (node === null || typeof node !== 'object' || depth > 4) return undefined
  for (const [key, value] of Object.entries(node)) {
    if (key.toLowerCase() === 'hr') {
      const n = parseFloat(String(value))
      if (!Number.isNaN(n)) return n
    }
  }
  for (const value of Object.values(node)) {
    const found = findHeartRate(value, depth + 1)
    if (found !== undefined) return found
  }
  return undefined
}

export function parseGpx(xml) {
  const doc = parser.parse(xml)
  const gpx = doc.gpx
  if (!gpx) throw new Error('Not a valid GPX file: missing <gpx> root element')

  const points = []
  const laps = []

  for (const trk of arr(gpx.trk)) {
    for (const trkseg of arr(trk.trkseg)) {
      const lapPoints = []
      for (const trkpt of arr(trkseg.trkpt)) {
        const lat = parseFloat(trkpt['@_lat'])
        const lon = parseFloat(trkpt['@_lon'])
        const timeStr = trkpt.time
        if (Number.isNaN(lat) || Number.isNaN(lon) || !timeStr) continue
        const ele = trkpt.ele !== undefined ? parseFloat(trkpt.ele) : undefined
        const hr = trkpt.extensions ? findHeartRate(trkpt.extensions) : undefined
        const point = {
          lat,
          lon,
          elevationM: ele !== undefined && !Number.isNaN(ele) ? ele : undefined,
          heartRateBpm: hr,
          time: new Date(timeStr),
        }
        points.push(point)
        lapPoints.push(point)
      }
      // Each <trkseg> is treated as a pseudo-lap: GPX has no native lap
      // concept, but a segment boundary is the closest analogue (and some
      // exporters do insert one per structured-workout step).
      if (lapPoints.length > 0) laps.push({ points: lapPoints })
    }
  }
  return { points, laps }
}
