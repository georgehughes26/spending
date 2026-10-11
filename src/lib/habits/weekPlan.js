import { addDays, isMonday } from './dates'
import { resolveDayPlan } from './dayPlan'

const REQUIRED_DAY_FIELDS = ['date', 'sessions', 'calories', 'protein', 'steps', 'water']

// Returns a list of plain-English error strings; an empty list means the
// plan is valid. Never throws -- a malformed paste (not even an object,
// bad JSON already caught by the caller) just produces a generic message.
export function validateWeekPlan(plan) {
  const errors = []

  if (plan == null || typeof plan !== 'object') {
    return ['Pasted content is not a JSON object']
  }
  if (plan.type !== 'week_plan') {
    errors.push('Missing or invalid "type" (expected "week_plan")')
  }
  if (!plan.week_start) {
    errors.push('Missing "week_start"')
  } else if (Number.isNaN(Date.parse(plan.week_start))) {
    errors.push(`"week_start" (${plan.week_start}) is not a valid date`)
  } else if (!isMonday(plan.week_start)) {
    errors.push(`"week_start" (${plan.week_start}) must be a Monday`)
  }

  if (!Array.isArray(plan.days)) {
    errors.push('Missing "days" array')
    return errors
  }
  if (plan.days.length !== 7) {
    errors.push(`"days" must contain exactly 7 entries (found ${plan.days.length})`)
  }

  plan.days.forEach((day, i) => {
    const label = `Day ${i + 1}`
    if (day == null || typeof day !== 'object') {
      errors.push(`${label} is not an object`)
      return
    }
    for (const field of REQUIRED_DAY_FIELDS) {
      if (day[field] === undefined || day[field] === null) {
        errors.push(`${label} is missing "${field}"`)
      }
    }
    if (day.sessions !== undefined && !Array.isArray(day.sessions)) {
      errors.push(`${label}'s "sessions" must be an array (use [] for a rest day)`)
    }
  })

  if (errors.length === 0 && isMonday(plan.week_start)) {
    plan.days.forEach((day, i) => {
      const expected = addDays(plan.week_start, i)
      if (day.date !== expected) {
        errors.push(`Day ${i + 1}'s date should be ${expected} (found ${day.date})`)
      }
    })
  }

  return errors
}

// Normalizes a validated plan's days down to the fields we store, dropping
// anything else the coach's JSON might add later.
export function normalizeWeekPlanDays(plan) {
  return plan.days.map((day) => ({
    date: day.date,
    sessions: Array.isArray(day.sessions) ? day.sessions : [],
    calories: Number(day.calories),
    protein: Number(day.protein),
    steps: Number(day.steps),
    water: Number(day.water),
    note: day.note ?? null,
  }))
}

// One row per date comparing what's in effect now against the incoming
// plan, for the import preview. hasExistingTick flags a day that already
// has a logged tick at a session position whose name is about to change --
// the tick itself is untouched (ticks are stored by position, not name), but
// the preview should say so.
export function diffWeekPlan(normalizedDays, weekPlans, template, dailyLogsByDate) {
  return normalizedDays.map((incoming) => {
    const current = resolveDayPlan(incoming.date, weekPlans, template)
    const fields = ['sessions', 'calories', 'protein', 'steps', 'water', 'note']
    const changed = {}
    for (const f of fields) {
      changed[f] = JSON.stringify(current[f] ?? null) !== JSON.stringify(incoming[f] ?? null)
    }

    const existingTicks = dailyLogsByDate?.[incoming.date]?.session_ticks ?? []
    const renamedTickedSessions = current.sessions
      .map((name, i) => ({ name, i }))
      .filter(({ i }) => existingTicks[i] && current.sessions[i] !== incoming.sessions[i])
      .map(({ name }) => name)

    return { date: incoming.date, current, incoming, changed, renamedTickedSessions }
  })
}
