// Shared Garmin Connect client for Edge Functions -- both directions live
// here: pushing planned Running workouts to a watch, and pulling completed
// Strength sessions' set-by-set data back out. Session (OAuth1 + OAuth2
// tokens) is cached in running_garmin_sessions per user, the same
// cache-in-a-table pattern _shared/gocardless.ts already uses for
// GoCardless -- necessary because an Edge Function is stateless between
// invocations, unlike the standalone app's local-file token cache.
import { GarminConnect } from 'npm:garmin-connect'

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}

async function loadCachedSession(supabaseAdmin: any, userId: string) {
  const { data } = await supabaseAdmin.from('running_garmin_sessions').select('*').eq('user_id', userId).maybeSingle()
  return data
}

async function saveSession(supabaseAdmin: any, userId: string, client: GarminConnect) {
  const tokens = client.exportToken()
  await supabaseAdmin.from('running_garmin_sessions').upsert({
    user_id: userId,
    oauth1_token: tokens.oauth1,
    oauth2_token: tokens.oauth2,
    updated_at: new Date().toISOString(),
  })
}

/** Returns a logged-in GarminConnect client, restoring the cached session if it still works, logging in fresh otherwise. */
export async function getGarminClient(supabaseAdmin: any, userId: string): Promise<GarminConnect> {
  const email = Deno.env.get('GARMIN_EMAIL')
  const password = Deno.env.get('GARMIN_PASSWORD')
  if (!email || !password) throw new Error('Missing GARMIN_EMAIL / GARMIN_PASSWORD function secrets')

  const client = new GarminConnect({ username: email, password })

  const cached = await loadCachedSession(supabaseAdmin, userId)
  if (cached?.oauth1_token && cached?.oauth2_token) {
    try {
      client.loadToken(cached.oauth1_token, cached.oauth2_token)
      await client.getUserProfile() // cheap call to confirm the restored session still works
      return client
    } catch {
      // fall through to a fresh login
    }
  }

  await client.login()
  await saveSession(supabaseAdmin, userId, client)
  return client
}

/**
 * The activity-service exerciseSets endpoint isn't in the library's typed
 * surface, but is reachable via its underlying http client -- confirmed
 * directly against a real completed session before building this (see
 * TRAINING.md). Returns raw entries: { exercises, duration, repetitionCount,
 * weight (grams), setType: 'ACTIVE'|'REST', startTime }.
 */
export async function fetchExerciseSets(client: GarminConnect, activityId: string | number) {
  const url = `https://connectapi.garmin.com/activity-service/activity/${activityId}/exerciseSets`
  const data = await (client as any).client.get(url)
  return data.exerciseSets ?? []
}
