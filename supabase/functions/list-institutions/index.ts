// POST /list-institutions  { country?: 'GB' }
// Returns the list of banks GoCardless supports for a country, for the
// "pick your bank" step of the Connect Bank flow.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, gcFetch, getAccessToken, jsonResponse } from '../_shared/gocardless.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const country = body.country ?? 'GB'

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    )

    const accessToken = await getAccessToken(supabaseAdmin)
    const institutions = await gcFetch(`/institutions/?country=${country}`, accessToken)

    return jsonResponse(institutions)
  } catch (err) {
    return jsonResponse({ error: err.message }, 500)
  }
})
