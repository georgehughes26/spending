import { addDays, parseISODate } from './dates'

const DAY_MS = 86400000

// The straight line from start_weight on plan_start to goal_weight on
// goal_date -- clamped to the endpoints so a date outside the plan window
// doesn't extrapolate into a nonsense weight.
export function goalLineWeight(dateString, settings) {
  const { plan_start, goal_date, start_weight, goal_weight } = settings
  const start = parseISODate(plan_start).getTime()
  const end = parseISODate(goal_date).getTime()
  const d = parseISODate(dateString).getTime()
  if (end <= start) return goal_weight
  const t = Math.max(0, Math.min(1, (d - start) / (end - start)))
  return start_weight + (goal_weight - start_weight) * t
}

// 7-day rolling average ending on dateString, ignoring days with no
// weigh-in. Needs at least 3 of the last 7 days logged to count as a trend
// at all, otherwise a single weigh-in would swing wildly day to day.
export function trendWeight(dateString, dailyLogsByDate) {
  const values = []
  for (let i = 0; i < 7; i++) {
    const key = addDays(dateString, -i)
    const w = dailyLogsByDate[key]?.weight
    if (w != null) values.push(Number(w))
  }
  if (values.length < 3) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

// diff = trend - goalLine: positive means heavier than the line (behind,
// since the goal is to lose weight), negative means lighter (ahead).
export function onTrackStatus(trend, goalLine) {
  if (trend == null) return null
  const diff = trend - goalLine
  if (Math.abs(diff) <= 0.3) return { status: 'on-track', diff }
  return { status: diff < 0 ? 'ahead' : 'behind', diff }
}

// kg/week still needed from the trend weight to reach goal_weight by
// goal_date -- null once there's no trend to work from, 0 once the goal
// date has passed (nothing left to "need").
export function neededPerWeek(trend, goalWeight, dateString, goalDate) {
  if (trend == null) return null
  const weeksLeft = (parseISODate(goalDate).getTime() - parseISODate(dateString).getTime()) / (DAY_MS * 7)
  if (weeksLeft <= 0) return 0
  return (trend - goalWeight) / weeksLeft
}
