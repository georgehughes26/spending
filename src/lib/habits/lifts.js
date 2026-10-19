// A free-form lift log -- the app's job is just to capture reps/weight per
// set and whatever target weight the coach sent for an exercise that week,
// then report both back out plainly. Whether to go up, hold, or drop the
// weight is judged elsewhere (a separate coaching conversation), not here.

import { resolveDayPlan } from './dayPlan'

function normalizeExerciseName(name) {
  return name.trim().toLowerCase()
}

// This week's target weight per exercise, resolved from whichever of the
// week's days carries a lift_targets entry for it (a coach only needs to
// set it once, typically on the day that exercise is actually due).
function weekLiftTargets(dates, weekPlans, template) {
  const targets = new Map()
  for (const date of dates) {
    for (const t of resolveDayPlan(date, weekPlans, template).liftTargets ?? []) {
      if (t?.exercise) targets.set(normalizeExerciseName(t.exercise), { displayName: t.exercise, weight: t.weight })
    }
  }
  return targets
}

// Every distinct exercise logged in the given week (grouped by normalized
// name, since "Bench Press" one day and "bench press" another are the same
// exercise), each with its sets per day and this week's target weight if
// the coach set one.
export function weekLiftSummaries(dates, weekPlans, template, dailyLogsByDate) {
  const byExercise = new Map()
  for (const date of dates) {
    for (const l of dailyLogsByDate[date]?.lifts ?? []) {
      const key = normalizeExerciseName(l.exercise)
      if (!key) continue
      const entry = byExercise.get(key) ?? { displayName: l.exercise, dates: new Set() }
      entry.displayName = l.exercise // most-recent-in-the-week casing wins for display
      entry.dates.add(date)
      byExercise.set(key, entry)
    }
  }

  const targets = weekLiftTargets(dates, weekPlans, template)

  return [...byExercise.entries()]
    .sort((a, b) => a[1].displayName.toLowerCase().localeCompare(b[1].displayName.toLowerCase()))
    .map(([key, { displayName, dates: entryDates }]) => {
      const entries = [...entryDates].sort().map((date) => ({
        date,
        sets: dailyLogsByDate[date].lifts.find((l) => normalizeExerciseName(l.exercise) === key).sets,
      }))
      return { exercise: displayName, targetWeight: targets.get(key)?.weight ?? null, entries }
    })
}
