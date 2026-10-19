import { addDays } from './dates'

// The fixed set of habits every day has, before any custom ones are added
// in settings. Each number habit's "hit" rule decides what counts as done
// for scoring, streaks and the check-in export -- kept as data here so all
// three read the same rule instead of three hand-copied conditions.

export const TICK_HABITS = [
  { key: 'creatine', label: 'Creatine' },
  { key: 'vit_d', label: 'Vitamin D' },
]

export const NUMBER_HABITS = [
  // Not a daily tick -- some days a weigh-in just isn't possible, so this is
  // "hit" if there's been one at all in the last cadenceDays, not today
  // specifically. isWeighInOnCadence below is what actually evaluates it;
  // isNumberHabitHit can't (it has no access to the surrounding days).
  { key: 'weight', label: 'Weight', unit: 'kg', decimals: 1, hitRule: 'cadence', cadenceDays: 3 },
  // A ceiling, not a target to land on exactly -- under it is still a hit,
  // only going over (beyond the tolerance buffer) counts as a miss.
  { key: 'calories', label: 'Calories', unit: 'kcal', decimals: 0, hitRule: 'atMost' },
  { key: 'protein', label: 'Protein', unit: 'g', decimals: 0, hitRule: 'atLeast' },
  { key: 'steps', label: 'Steps', unit: 'steps', decimals: 0, hitRule: 'atLeast' },
  {
    key: 'water', label: 'Water', unit: 'L', decimals: 1, hitRule: 'atLeast',
    // Target/total stay in litres (the coach's week-plan JSON says "water":
    // 3.0 meaning 3L), but the buttons are labelled in ml since that's how a
    // bottle size is actually known -- amount is still added in litres.
    quickAdd: [
      { amount: 0.25, label: '+250ml' },
      { amount: 0.5, label: '+500ml' },
      { amount: 0.568, label: '+568ml (pint)' },
      { amount: 0.71, label: '+710ml (Owala)' },
    ],
  },
  { key: 'drinks', label: 'Drinks', unit: '', decimals: 0, hitRule: 'none' },
]

export function numberHabit(key) {
  return NUMBER_HABITS.find((h) => h.key === key)
}

// true/false/null -- null means "can't tell" (no target, or not logged and
// the rule isn't 'logged'/'cadence'), which callers treat as not-scored
// rather than as a miss. 'cadence' (weight) isn't decidable from a single
// value/target pair at all -- use isWeighInOnCadence for that instead.
export function isNumberHabitHit(key, value, target, tolerance) {
  const habit = numberHabit(key)
  if (!habit) return null
  if (habit.hitRule === 'logged') return value != null
  if (habit.hitRule === 'cadence') return null
  if (value == null) return false
  if (habit.hitRule === 'atMost') return target != null && value <= target + tolerance
  if (habit.hitRule === 'atLeast') return target != null && value >= target
  return null
}

// Needs the surrounding days, not just today's value -- "hit" for weight
// means a weigh-in anywhere in the last cadenceDays (today included), not
// specifically today, since not every day allows for one.
export function isWeighInOnCadence(dateString, dailyLogsByDate, windowDays) {
  for (let i = 0; i < windowDays; i++) {
    if (dailyLogsByDate[addDays(dateString, -i)]?.weight != null) return true
  }
  return false
}

// Still under/on/over for the check-in's informational breakdown -- 'under'
// just no longer counts as a miss for scoring (see isNumberHabitHit above).
export function caloriesStatus(value, target, tolerance) {
  if (value == null || target == null) return null
  const diff = value - target
  if (Math.abs(diff) <= tolerance) return 'on'
  return diff < 0 ? 'under' : 'over'
}

// Scored = contributes to the day score ring and to streaks. Drinks and
// notes are tracked but never scored, matching the brief's "not scored"
// column for them.
const SCORED_NUMBER_KEYS = ['weight', 'calories', 'protein', 'steps', 'water']

export function scoreDay(dayPlan, log, settings, customHabits = [], dailyLogsByDate = {}, date = null) {
  let done = 0
  let total = 0

  for (const h of TICK_HABITS) {
    total += 1
    if (log?.[h.key]) done += 1
  }

  const sessions = dayPlan?.sessions ?? []
  sessions.forEach((_, i) => {
    total += 1
    if (log?.session_ticks?.[i]) done += 1
  })

  for (const key of SCORED_NUMBER_KEYS) {
    if (key === 'weight') {
      total += 1
      if (date && isWeighInOnCadence(date, dailyLogsByDate, numberHabit('weight').cadenceDays)) done += 1
      continue
    }
    const target = dayPlan?.[key] ?? null
    const value = log?.[key] ?? null
    const hit = isNumberHabitHit(key, value, target, settings?.calorie_tolerance ?? 100)
    if (hit == null) continue
    total += 1
    if (hit) done += 1
  }

  for (const custom of customHabits) {
    if (custom.archived) continue
    const value = log?.custom_values?.[custom.id]
    if (custom.type === 'tick') {
      total += 1
      if (value) done += 1
    } else if (custom.target != null) {
      total += 1
      if (value != null && Number(value) >= Number(custom.target)) done += 1
    }
  }

  return { done, total }
}
