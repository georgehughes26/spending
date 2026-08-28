import { supabase } from '../supabaseClient'

async function invoke(action, body) {
  const { data, error } = await supabase.functions.invoke('garmin', { body: { action, ...body } })
  if (error) {
    // supabase-js's own error.message for a non-2xx response is a generic
    // "Edge Function returned a non-2xx status code" -- the actual message
    // we returned in the response body is on error.context (the raw
    // Response), which needs reading separately.
    const detail = await error.context?.json?.().catch(() => null)
    throw new Error(detail?.error ?? error.message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

/** Recent Garmin strength_training activities to pick from, most recent first. */
export async function listStrengthActivities(userId, limit = 10) {
  const { activities } = await invoke('list_strength_activities', { user_id: userId, limit })
  return activities
}

/** Raw per-set data for one completed Garmin activity. */
export async function fetchExerciseSets(userId, activityId) {
  const { exerciseSets } = await invoke('fetch_exercise_sets', { user_id: userId, activity_id: activityId })
  return exerciseSets
}

/** Pushes an already-built workout payload (buildGarminWorkout's output) to the user's Garmin account. */
export async function pushWorkoutToGarmin(userId, workout) {
  const { workoutId } = await invoke('push_workout', { user_id: userId, workout })
  return workoutId
}
