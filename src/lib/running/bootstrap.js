import { createProfile, getAllPlanWeeks, getProfile, hasProfile } from './db'
import { generateFullPlan } from './generate'
import { backfillMissingRatings } from './backfill'
import { computePlanLength } from './curve'
import { PLAN_GOAL_5K_SECONDS, PLAN_START_5K_SECONDS } from './constants'

function addDays(date, days) {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10)
}

/** Creates the athlete profile and generates the full plan the first time this user opens Running. */
export async function ensurePlanBootstrapped(userId) {
  if (!(await hasProfile(userId))) {
    const today = new Date()
    const totalWeeks = computePlanLength(PLAN_START_5K_SECONDS, PLAN_GOAL_5K_SECONDS)
    const goalDate = toIsoDate(addDays(today, (totalWeeks - 1) * 7 + 6))
    try {
      await createProfile(userId, {
        pb_5k_seconds: 1560, // 26:00
        pb_5k_date: null,
        current_fitness_5k_equiv_seconds: PLAN_START_5K_SECONDS,
        goal_5k_seconds: PLAN_GOAL_5K_SECONDS,
        goal_date: goalDate,
      })
    } catch (err) {
      // Two concurrent first-loads (React StrictMode's double effect in dev,
      // or a genuine double-navigation) can both see "no profile" and race
      // to create one — the loser hits the primary key here. That's fine,
      // the winner's row is what we want; only a real failure should throw.
      if (!String(err.message).includes('running_profiles_pkey')) throw err
    }
  }
  if ((await getAllPlanWeeks(userId)).length === 0) {
    const profile = await getProfile(userId)
    await generateFullPlan(userId, new Date(), profile.current_fitness_5k_equiv_seconds, profile.goal_5k_seconds)
  }
  await backfillMissingRatings(userId)
}
