/**
 * Real published population strength standards (strengthlevel.com, men's
 * tables, aggregated from 1M+ submitted lifts), used to answer "how do I
 * compare to other lifters" -- not just "which of my own exercises am I
 * relatively best at" (that's a different, self-referential question the
 * old relative-strength tile answered; this one answers the one actually
 * asked).
 *
 * Genuine per-exercise population data only exists for a handful of common
 * gym lifts. Where the program's exercise is that lift (or close enough to
 * be a defensible stand-in, flagged via `approx`), we use it; everything
 * else honestly has no comparison rather than a fabricated one -- see
 * EXERCISE_MAP below for exactly which exercises get which treatment.
 *
 * Height is deliberately not used: strengthlevel's own standards don't
 * split by height either (same reasoning as rankRelativeStrength before
 * it -- no reliable data ties height directly to a strength standard).
 *
 * Age adjustment: strengthlevel only publishes a full age curve for Bench
 * Press. We apply that curve as a proportional multiplier to every lift's
 * bodyweight-based threshold, since it's the only real age-effect data
 * available and age-related strength decline is a general phenomenon, not
 * bench-specific -- an approximation, not a fabrication.
 */

const BW_ROWS = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140]

// Each row: [Beginner, Novice, Intermediate, Advanced, Elite] weight in kg,
// at the corresponding BW_ROWS bodyweight.
const STANDARDS = {
  dumbbell_bench_press: [
    [9, 16, 24, 35, 47], [11, 18, 27, 39, 51], [13, 20, 30, 42, 55], [14, 22, 33, 45, 58],
    [16, 24, 35, 48, 62], [17, 26, 37, 51, 65], [19, 28, 40, 53, 68], [21, 30, 42, 56, 71],
    [22, 32, 44, 58, 74], [24, 34, 46, 61, 76], [25, 36, 48, 63, 79], [27, 37, 50, 65, 82],
    [28, 39, 52, 68, 84], [29, 41, 54, 70, 86], [31, 42, 56, 72, 89], [32, 44, 58, 74, 91],
    [33, 45, 59, 76, 93], [35, 47, 61, 78, 95], [36, 48, 63, 80, 97],
  ],
  dumbbell_shoulder_press: [
    [7, 12, 19, 27, 36], [8, 14, 21, 30, 40], [10, 15, 23, 32, 43], [11, 17, 25, 35, 46],
    [12, 19, 27, 37, 48], [14, 21, 29, 40, 51], [15, 22, 31, 42, 54], [16, 24, 33, 44, 56],
    [18, 25, 35, 46, 59], [19, 27, 37, 48, 61], [20, 28, 39, 50, 63], [21, 30, 40, 52, 65],
    [23, 31, 42, 54, 67], [24, 33, 44, 56, 69], [25, 34, 45, 58, 71], [26, 35, 47, 59, 73],
    [27, 37, 48, 61, 75], [28, 38, 50, 63, 77], [29, 39, 51, 64, 79],
  ],
  leg_press: [
    [51, 89, 141, 204, 275], [61, 102, 157, 223, 298], [71, 115, 173, 242, 319], [81, 127, 188, 260, 339],
    [90, 139, 202, 277, 359], [100, 151, 216, 293, 377], [109, 162, 230, 309, 395], [118, 173, 243, 324, 412],
    [127, 184, 255, 338, 429], [135, 194, 268, 353, 444], [144, 205, 280, 366, 460], [152, 214, 291, 379, 475],
    [160, 224, 302, 392, 489], [168, 234, 313, 405, 503], [176, 243, 324, 417, 516], [184, 252, 334, 429, 529],
    [191, 261, 344, 440, 542], [199, 269, 354, 451, 554], [206, 278, 364, 462, 567],
  ],
  lat_pulldown: [
    [29, 43, 60, 79, 101], [32, 47, 64, 85, 107], [35, 50, 69, 90, 113], [39, 54, 73, 95, 118],
    [42, 57, 77, 99, 123], [44, 61, 81, 104, 128], [47, 64, 85, 108, 133], [50, 67, 88, 112, 137],
    [52, 70, 92, 116, 142], [55, 73, 95, 120, 146], [57, 76, 98, 123, 150], [60, 79, 101, 127, 154],
    [62, 81, 104, 130, 157], [64, 84, 107, 133, 161], [66, 86, 110, 136, 164], [68, 89, 112, 139, 167],
    [70, 91, 115, 142, 171], [72, 93, 118, 145, 174], [74, 95, 120, 148, 177],
  ],
  seated_cable_row: [
    [26, 40, 57, 78, 101], [30, 44, 63, 84, 108], [33, 49, 68, 90, 115], [37, 53, 73, 96, 122],
    [40, 57, 78, 102, 128], [44, 61, 83, 107, 134], [47, 65, 87, 112, 140], [50, 69, 91, 117, 145],
    [53, 72, 96, 122, 150], [56, 76, 100, 127, 155], [59, 79, 104, 131, 160], [62, 83, 107, 135, 165],
    [65, 86, 111, 139, 170], [68, 89, 115, 143, 174], [70, 92, 118, 147, 178], [73, 95, 122, 151, 182],
    [76, 98, 125, 155, 186], [78, 101, 128, 158, 190], [81, 104, 131, 162, 194],
  ],
  dumbbell_curl: [
    [4, 9, 15, 23, 32], [5, 10, 16, 25, 34], [6, 11, 18, 26, 36], [6, 11, 19, 28, 38],
    [7, 12, 20, 29, 39], [8, 13, 21, 30, 41], [8, 14, 22, 32, 42], [9, 15, 23, 33, 44],
    [9, 16, 24, 34, 45], [10, 16, 25, 35, 47], [11, 17, 26, 36, 48], [11, 18, 27, 37, 49],
    [12, 19, 28, 38, 50], [12, 19, 28, 39, 51], [13, 20, 29, 40, 52], [13, 21, 30, 41, 53],
    [14, 21, 31, 42, 54], [14, 22, 31, 43, 55], [15, 22, 32, 44, 56],
  ],
}

const TIER_NAMES = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite']

/**
 * Which of the user's actual exercise names map to which standard table.
 * Exact lowercase name match -- this is single-user software with a known,
 * fixed exercise list, not a general fuzzy-matching product. `approx: true`
 * means the mapped lift isn't quite the same movement (flagged in the UI).
 */
const EXERCISE_MAP = {
  'dumbbell bench': { table: 'dumbbell_bench_press', label: 'vs. Dumbbell Bench Press standards', approx: false },
  'incline dumbbell': { table: 'dumbbell_bench_press', label: 'vs. (flat) Dumbbell Bench Press standards', approx: true },
  'shoulder press': { table: 'dumbbell_shoulder_press', label: 'vs. Dumbbell Shoulder Press standards', approx: false },
  'leg press': { table: 'leg_press', label: 'vs. Leg Press standards', approx: false },
  'lat pull down': { table: 'lat_pulldown', label: 'vs. Lat Pulldown standards', approx: false },
  'seated row': { table: 'seated_cable_row', label: 'vs. Seated Cable Row standards', approx: false },
  'bicep curl': { table: 'dumbbell_curl', label: 'vs. Dumbbell Curl standards', approx: false },
  'hammer curl': { table: 'dumbbell_curl', label: 'vs. Dumbbell Curl standards (closest available)', approx: true },
}

// Age -> multiplier on the bodyweight standard, relative to the 25-40
// plateau (1.0x). Only real data point on the site; the dip/rebound past
// 85 in the raw table looks like a small-sample artefact, so we hold flat
// beyond it rather than propagate it.
const AGE_CURVE = [
  [15, 0.71], [20, 0.82], [25, 1.0], [40, 1.0], [45, 0.95], [50, 0.89],
  [55, 0.82], [60, 0.75], [65, 0.68], [70, 0.61], [75, 0.54], [80, 0.49], [85, 0.44],
]

function interpolateRow(table, bodyweightKg) {
  const bw = Math.min(Math.max(bodyweightKg, BW_ROWS[0]), BW_ROWS[BW_ROWS.length - 1])
  let i = 0
  while (i < BW_ROWS.length - 2 && BW_ROWS[i + 1] < bw) i++
  const lo = BW_ROWS[i]
  const hi = BW_ROWS[i + 1]
  const t = hi === lo ? 0 : (bw - lo) / (hi - lo)
  return table[i].map((loVal, j) => loVal + (table[i + 1][j] - loVal) * t)
}

function ageMultiplier(age) {
  if (!age) return 1
  const a = Math.min(Math.max(age, AGE_CURVE[0][0]), AGE_CURVE[AGE_CURVE.length - 1][0])
  let i = 0
  while (i < AGE_CURVE.length - 2 && AGE_CURVE[i + 1][0] < a) i++
  const [loAge, loMul] = AGE_CURVE[i]
  const [hiAge, hiMul] = AGE_CURVE[i + 1]
  const t = hiAge === loAge ? 0 : (a - loAge) / (hiAge - loAge)
  return loMul + (hiMul - loMul) * t
}

function tierFor(weightKg, thresholds) {
  if (weightKg < thresholds[0]) {
    return { tier: 'Untrained', next: 'Beginner', progress: thresholds[0] > 0 ? weightKg / thresholds[0] : 0 }
  }
  for (let i = 0; i < thresholds.length - 1; i++) {
    if (weightKg < thresholds[i + 1]) {
      return { tier: TIER_NAMES[i], next: TIER_NAMES[i + 1], progress: (weightKg - thresholds[i]) / (thresholds[i + 1] - thresholds[i]) }
    }
  }
  return { tier: 'Elite', next: null, progress: 1 }
}

/** Null when this exercise has no defensible standard, no bodyweight on file, or nothing logged yet. */
export function compareToPopulation(exercise, bodyweightKg, age) {
  const mapping = EXERCISE_MAP[exercise.name.trim().toLowerCase()]
  if (!mapping) return null
  if (!exercise.target_weight_kg || exercise.target_weight_kg <= 0) return null
  if (!bodyweightKg) return null

  const rawThresholds = interpolateRow(STANDARDS[mapping.table], bodyweightKg)
  const mult = ageMultiplier(age)
  const thresholds = rawThresholds.map((v) => v * mult)
  const { tier, next, progress } = tierFor(exercise.target_weight_kg, thresholds)

  return {
    exercise,
    label: mapping.label,
    approx: mapping.approx,
    tier,
    next,
    progressPct: Math.round(Math.max(0, Math.min(1, progress)) * 100),
    weightKg: exercise.target_weight_kg,
  }
}

const TIER_RANK = { Untrained: 0, Beginner: 1, Novice: 2, Intermediate: 3, Advanced: 4, Elite: 5 }

/** Every exercise with a real standard to compare against, best tier first. */
export function rankPopulationComparison(exercises, bodyweightKg, age) {
  return exercises
    .map((ex) => compareToPopulation(ex, bodyweightKg, age))
    .filter(Boolean)
    .sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || b.progressPct - a.progressPct)
}
