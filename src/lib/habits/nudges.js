import { addDays, todayISODate, weekStartFor, weekDatesFor } from './dates'
import { resolveDayPlan } from './dayPlan'
import { isNumberHabitHit } from './builtInHabits'
import { computeStreak } from './streaks'

// In-app banners only (no push notifications) -- each is {kind, text},
// kind 'warning' or 'positive' just picks the banner's colour.
export function computeNudges({ settings, template, weekPlans, dailyLogsByDate, customHabits }) {
  const today = todayISODate()
  const nudges = []

  // 1. Weigh-in gap.
  let lastWeighIn = null
  for (let d = today; d >= settings.plan_start; d = addDays(d, -1)) {
    if (dailyLogsByDate[d]?.weight != null) { lastWeighIn = d; break }
  }
  const daysSinceWeighIn = lastWeighIn
    ? (new Date(today) - new Date(lastWeighIn)) / 86400000
    : (new Date(today) - new Date(settings.plan_start)) / 86400000
  if (daysSinceWeighIn >= 3) {
    nudges.push({ kind: 'warning', text: `You haven't weighed in for ${Math.round(daysSinceWeighIn)} days` })
  }

  // 2. Missed sessions in the last 7 completed days (today excluded -- it
  // isn't over yet, so an untouched session today isn't "missed").
  const missed = []
  for (let i = 1; i <= 7; i++) {
    const d = addDays(today, -i)
    if (d < settings.plan_start) continue
    const plan = resolveDayPlan(d, weekPlans, template)
    plan.sessions.forEach((name, idx) => {
      if (!dailyLogsByDate[d]?.session_ticks?.[idx]) missed.push(name)
    })
  }
  if (missed.length > 0) {
    const names = [...new Set(missed)]
    nudges.push({ kind: 'warning', text: `Missed in the last 7 days: ${names.slice(0, 3).join(', ')}${names.length > 3 ? '…' : ''}` })
  }

  // 3. Protein miss streak, ending yesterday.
  let proteinMissStreak = 0
  for (let i = 1; ; i++) {
    const d = addDays(today, -i)
    if (d < settings.plan_start) break
    const target = resolveDayPlan(d, weekPlans, template).protein
    const hit = isNumberHabitHit('protein', dailyLogsByDate[d]?.protein ?? null, target, settings.calorie_tolerance)
    if (hit) break
    proteinMissStreak += 1
  }
  if (proteinMissStreak >= 2) {
    nudges.push({ kind: 'warning', text: `Protein missed ${proteinMissStreak} days in a row` })
  }

  // 4. No plan for next week, from Saturday onward.
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay() // 0 Sun .. 6 Sat
  if (weekday === 6 || weekday === 0) {
    const nextWeekStart = addDays(weekStartFor(today), 7)
    if (!weekPlans.some((p) => p.week_start === nextWeekStart)) {
      nudges.push({ kind: 'warning', text: 'No plan imported for next week' })
    }
  }

  // 5. Positive streaks.
  const ctx = { dailyLogsByDate, weekPlans, template, settings }
  for (const h of [{ kind: 'tick', key: 'creatine', label: 'Creatine' }, { kind: 'tick', key: 'vit_d', label: 'Vitamin D' }]) {
    const streak = computeStreak(h, settings.plan_start, ctx)
    if (streak && streak.current >= 3) nudges.push({ kind: 'positive', text: `${h.label} ${streak.current} days in a row 🔥` })
  }
  for (const custom of customHabits) {
    if (custom.type !== 'tick') continue
    const streak = computeStreak({ kind: 'custom', custom }, settings.plan_start, ctx)
    if (streak && streak.current >= 3) nudges.push({ kind: 'positive', text: `${custom.label} ${streak.current} days in a row 🔥` })
  }

  const weekDates = weekDatesFor(weekStartFor(today)).filter((d) => d <= today)
  if (weekDates.length >= 3) {
    const proteinHits = weekDates.filter((d) => {
      const target = resolveDayPlan(d, weekPlans, template).protein
      return isNumberHabitHit('protein', dailyLogsByDate[d]?.protein ?? null, target, settings.calorie_tolerance)
    }).length
    if (proteinHits === weekDates.length) {
      nudges.push({ kind: 'positive', text: `Protein hit ${proteinHits}/${proteinHits} this week` })
    }
  }

  return nudges
}
