import { weekDatesFor, weekNumberFor, totalWeeksFor, formatShortDay, formatLongDay, addDays } from './dates'
import { resolveDayPlan } from './dayPlan'
import { goalLineWeight, trendWeight, onTrackStatus, neededPerWeek } from './goalLine'
import { isNumberHabitHit, caloriesStatus } from './builtInHabits'

const DASH = '—'

function fmtNum(value, decimals = 0) {
  if (value == null || Number.isNaN(value)) return null
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)
}

function fmtKg(value) {
  const n = fmtNum(value, 1)
  return n == null ? DASH : `${n}kg`
}

function statusLabel(status) {
  if (status === 'on-track') return 'ON TRACK'
  if (status === 'ahead') return 'AHEAD'
  if (status === 'behind') return 'BEHIND'
  return DASH
}

function sessionsCell(dayPlan, log) {
  if (dayPlan.sessions.length === 0) return 'Rest'
  return dayPlan.sessions
    .map((name, i) => (log?.session_ticks?.[i] ? `${name} ✓` : name))
    .join(', ')
}

function pairCell(actual, target, decimals = 0) {
  const a = fmtNum(actual, decimals)
  const t = fmtNum(target, decimals)
  if (a == null) return DASH
  return `${a}/${t ?? DASH}`
}

function tickCell(value) {
  return value ? '✓' : DASH
}

function buildDailyRows(dates, weekPlans, template, dailyLogsByDate) {
  return dates.map((date) => {
    const plan = resolveDayPlan(date, weekPlans, template)
    const log = dailyLogsByDate[date] ?? null
    const cells = [
      formatShortDay(date),
      sessionsCell(plan, log),
      pairCell(log?.calories, plan.calories, 0),
      pairCell(log?.protein, plan.protein, 0),
      pairCell(log?.steps, plan.steps, 0),
      pairCell(log?.water, plan.water, 1),
      log?.weight != null ? fmtNum(log.weight, 1) : DASH,
      String(log?.drinks ?? 0),
      tickCell(log?.creatine),
      tickCell(log?.vit_d),
      log?.note ? log.note : DASH,
    ]
    return cells.join(' | ')
  })
}

export function weekTotals(dates, weekPlans, template, dailyLogsByDate, settings) {
  let proteinHit = 0
  let caloriesLogged = []
  let caloriesTargets = []
  let under = 0, on = 0, over = 0
  let sessionsPlanned = 0, sessionsDone = 0
  const missedSessions = []
  let stepsHit = 0
  const stepsLogged = []
  let waterHit = 0
  let creatine = 0, vitD = 0, drinksTotal = 0, weighIns = 0

  for (const date of dates) {
    const plan = resolveDayPlan(date, weekPlans, template)
    const log = dailyLogsByDate[date] ?? null

    if (isNumberHabitHit('protein', log?.protein ?? null, plan.protein, settings.calorie_tolerance)) proteinHit += 1
    if (log?.calories != null) {
      caloriesLogged.push(log.calories)
      caloriesTargets.push(plan.calories)
      const status = caloriesStatus(log.calories, plan.calories, settings.calorie_tolerance)
      if (status === 'under') under += 1
      else if (status === 'on') on += 1
      else if (status === 'over') over += 1
    }

    plan.sessions.forEach((name, i) => {
      sessionsPlanned += 1
      if (log?.session_ticks?.[i]) sessionsDone += 1
      else missedSessions.push(name)
    })

    if (isNumberHabitHit('steps', log?.steps ?? null, plan.steps, settings.calorie_tolerance)) stepsHit += 1
    if (log?.steps != null) stepsLogged.push(log.steps)
    if (isNumberHabitHit('water', log?.water ?? null, plan.water, settings.calorie_tolerance)) waterHit += 1
    if (log?.creatine) creatine += 1
    if (log?.vit_d) vitD += 1
    drinksTotal += Number(log?.drinks ?? 0)
    if (log?.weight != null) weighIns += 1
  }

  const avg = (arr) => (arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length)

  return {
    proteinHit, avgCalories: avg(caloriesLogged), avgCaloriesTarget: avg(caloriesTargets),
    under, on, over, sessionsPlanned, sessionsDone, missedSessions,
    stepsHit, avgSteps: avg(stepsLogged), waterHit, creatine, vitD, drinksTotal, weighIns,
  }
}

// Builds the exact plain-text check-in block described in the brief --
// every day gets a line (checkin.js's per-field "—" handles the "nothing
// logged" case automatically), and the marker lines are always present so
// the coach's side can reliably find the start/end of the block.
export function buildCheckIn({ weekStart, settings, template, weekPlans, dailyLogsByDate }) {
  const dates = weekDatesFor(weekStart)
  const weekNum = weekNumberFor(weekStart, settings.plan_start)
  const totalWeeks = totalWeeksFor(settings.plan_start, settings.goal_date)
  const plan = weekPlans.find((p) => p.week_start === weekStart)

  const weekEnd = dates[6]
  const trend = trendWeight(weekEnd, dailyLogsByDate)
  const goalLine = goalLineWeight(weekEnd, settings)
  const track = onTrackStatus(trend, goalLine)
  const needed = neededPerWeek(trend, settings.goal_weight, weekEnd, settings.goal_date)

  const prevWeekEnd = addDays(weekStart, -1)
  const prevTrend = trendWeight(prevWeekEnd, dailyLogsByDate)
  const change = trend != null && prevTrend != null ? trend - prevTrend : null

  const totals = weekTotals(dates, weekPlans, template, dailyLogsByDate, settings)

  const lines = []
  lines.push('=== CHECK-IN v1 ===')
  lines.push(`Week ${weekNum} of ${totalWeeks} (${formatShortDay(dates[0])} – ${formatShortDay(dates[6])} ${dates[6].slice(0, 4)})`)
  if (plan?.summary) lines.push(`Plan summary: ${plan.summary}`)
  lines.push('')
  lines.push('GOAL')
  lines.push(`Goal: ${fmtKg(settings.goal_weight)} by ${formatLongDay(settings.goal_date)} (start ${fmtKg(settings.start_weight)} on ${formatShortDay(settings.plan_start)})`)
  lines.push(
    `Trend weight (7-day avg): ${trend != null ? fmtKg(trend) : DASH} | Goal line today: ${fmtKg(goalLine)} | Status: ${
      track ? `${statusLabel(track.status)} (${fmtNum(Math.abs(track.diff), 1)} ${track.diff <= 0 ? 'ahead' : 'behind'})` : DASH
    }`,
  )
  lines.push(`Last week trend: ${prevTrend != null ? fmtKg(prevTrend) : DASH} | Change: ${change != null ? fmtKg(change) : DASH}`)
  lines.push(`Needed from here: ${needed != null ? `${fmtNum(Math.abs(needed), 2)}kg/week` : DASH}`)
  lines.push('')
  lines.push('WEEK TOTALS')
  lines.push(
    `Protein hit: ${totals.proteinHit}/7 | Calories: avg ${fmtNum(totals.avgCalories) ?? DASH} vs ${fmtNum(totals.avgCaloriesTarget) ?? DASH} target (under ${totals.under}, on ${totals.on}, over ${totals.over})`,
  )
  lines.push(`Sessions: ${totals.sessionsDone}/${totals.sessionsPlanned} (missed: ${totals.missedSessions.length ? totals.missedSessions.join(', ') : 'none'})`)
  lines.push(`Steps hit: ${totals.stepsHit}/7 (avg ${fmtNum(totals.avgSteps) ?? DASH}) | Water hit: ${totals.waterHit}/7`)
  lines.push(`Creatine ${totals.creatine}/7 | Vit D ${totals.vitD}/7 | Drinks: ${totals.drinksTotal}`)
  lines.push(`Weigh-ins: ${totals.weighIns}/7`)
  lines.push('')
  lines.push('DAILY')
  lines.push('Date | Sessions (done/planned) | Cals (act/tgt) | Protein | Steps | Water | Weight | Drinks | Creatine | VitD | Note')
  lines.push(...buildDailyRows(dates, weekPlans, template, dailyLogsByDate))
  lines.push('=== END ===')

  return lines.join('\n')
}
