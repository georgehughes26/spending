// POST /garmin  { action, user_id, ... }
// One function, three actions -- keeps deploy/secrets management to a
// single place rather than three near-identical functions:
//
//   list_strength_activities { user_id, limit? }
//     -> { activities: [{ activityId, name, startTimeLocal }] }
//     Recent Garmin strength_training activities to pick from.
//
//   fetch_exercise_sets { user_id, activity_id }
//     -> { exerciseSets: [...] }
//     Raw per-set data (exercise name, reps, weight in grams, ACTIVE/REST)
//     for one completed activity -- the client matches ACTIVE sets to its
//     program exercises by order and prefills the log form for review.
//
//   push_workout { user_id, workout }
//     -> { workoutId }
//     Pushes an already-built workout payload (built client-side by
//     src/lib/running/garmin/buildWorkout.js) to the user's Garmin account.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, fetchExerciseSets, getGarminClient, jsonResponse } from '../_shared/garmin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const body = await req.json()
    const { action, user_id } = body
    if (!user_id) return jsonResponse({ error: 'user_id is required' }, 400)
    if (!action) return jsonResponse({ error: 'action is required' }, 400)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const client = await getGarminClient(supabaseAdmin, user_id)

    if (action === 'list_strength_activities') {
      const limit = body.limit ?? 10
      const activities = await client.getActivities(0, limit)
      const strength = activities
        .filter((a: any) => a.activityType?.typeKey === 'strength_training')
        .map((a: any) => ({ activityId: a.activityId, name: a.activityName, startTimeLocal: a.startTimeLocal }))
      return jsonResponse({ activities: strength })
    }

    if (action === 'fetch_exercise_sets') {
      const activityId = body.activity_id
      if (!activityId) return jsonResponse({ error: 'activity_id is required' }, 400)
      const exerciseSets = await fetchExerciseSets(client, activityId)
      return jsonResponse({ exerciseSets })
    }

    if (action === 'push_workout') {
      const workout = body.workout
      if (!workout) return jsonResponse({ error: 'workout is required' }, 400)
      const result = await client.addWorkout(workout)
      return jsonResponse({ workoutId: String((result as any).workoutId) })
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
