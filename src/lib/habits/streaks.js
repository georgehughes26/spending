import { addDays, todayISODate } from './dates'
import { isNumberHabitHit, numberHabit } from './builtInHabits'
import { resolveDayPlan } from './dayPlan'

// Recomputed from the full log history every time rather than incrementally
// maintained -- the only way "fill in a missed day retroactively" naturally
// re-stitches a streak without separate backfill logic.
function buildHitSeries(dateFrom, dateTo, hitForDate) {
  const series = []
  for (let d = dateFrom; d <= dateTo; d = addDays(d, 1)) {
    series.push(hitForDate(d))
  }
  return series
}

function streakFromSeries(series) {
  let best = 0
  let run = 0
  for (const hit of series) {
    run = hit ? run + 1 : 0
    if (run > best) best = run
  }

  let current = 0
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i]) current += 1
    else break
  }
  return { current, best }
}

function hitForBuiltInTick(key, dateString, dailyLogsByDate) {
  return !!dailyLogsByDate[dateString]?.[key]
}

function hitForBuiltInNumber(key, dateString, dailyLogsByDate, weekPlans, template, settings) {
  const habit = numberHabit(key)
  if (!habit || habit.hitRule === 'none') return null
  const log = dailyLogsByDate[dateString]
  const target = resolveDayPlan(dateString, weekPlans, template)[key]
  const hit = isNumberHabitHit(key, log?.[key] ?? null, target, settings.calorie_tolerance)
  return hit == null ? false : hit
}

function hitForCustom(custom, dateString, dailyLogsByDate) {
  const value = dailyLogsByDate[dateString]?.custom_values?.[custom.id]
  if (custom.type === 'tick') return !!value
  if (custom.target == null) return null
  return value != null && Number(value) >= Number(custom.target)
}

// Returns { current, best }, or null for a habit with no "hit" concept
// (Drinks, or a custom number habit with no target).
export function computeStreak(habitRef, planStart, { dailyLogsByDate, weekPlans, template, settings }) {
  const today = todayISODate()
  const hasLogToday = !!dailyLogsByDate[today]

  let hitForDate
  if (habitRef.kind === 'tick') {
    hitForDate = (d) => hitForBuiltInTick(habitRef.key, d, dailyLogsByDate)
  } else if (habitRef.kind === 'number') {
    if (numberHabit(habitRef.key)?.hitRule === 'none') return null
    hitForDate = (d) => hitForBuiltInNumber(habitRef.key, d, dailyLogsByDate, weekPlans, template, settings)
  } else {
    if (habitRef.custom.type === 'number' && habitRef.custom.target == null) return null
    hitForDate = (d) => hitForCustom(habitRef.custom, d, dailyLogsByDate)
  }

  const endDate = hasLogToday ? today : addDays(today, -1)
  if (endDate < planStart) return { current: 0, best: 0 }

  const series = buildHitSeries(planStart, endDate, hitForDate)
  return streakFromSeries(series)
}
