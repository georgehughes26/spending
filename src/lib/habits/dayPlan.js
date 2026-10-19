import { weekStartFor, weekdayIndex } from './dates'

// Decides a date's targets/sessions: an imported week plan overriding its 7
// dates wins, otherwise the default template for that weekday. This is the
// single place both the day view and the check-in export resolve a date
// through, so they can never disagree about what was "planned".
export function resolveDayPlan(dateString, weekPlans, template) {
  const weekStart = weekStartFor(dateString)
  const plan = weekPlans.find((p) => p.week_start === weekStart)
  if (plan) {
    const day = plan.days.find((d) => d.date === dateString)
    if (day) {
      return {
        source: 'plan',
        date: dateString,
        sessions: day.sessions ?? [],
        calories: day.calories ?? null,
        protein: day.protein ?? null,
        steps: day.steps ?? null,
        water: day.water ?? null,
        note: day.note ?? null,
        planSummary: plan.summary ?? null,
        // Only an imported week plan can carry lift targets -- the default
        // template has no concept of a specific exercise to target a weight
        // for, only sessions/calories/etc.
        liftTargets: day.liftTargets ?? [],
      }
    }
  }

  const weekday = weekdayIndex(dateString)
  const t = template.find((row) => row.weekday === weekday)
  return {
    source: 'template',
    date: dateString,
    sessions: t?.sessions ?? [],
    calories: t?.calories ?? null,
    protein: t?.protein ?? null,
    steps: t?.steps ?? null,
    water: t?.water ?? null,
    note: null,
    planSummary: null,
    liftTargets: [],
  }
}
