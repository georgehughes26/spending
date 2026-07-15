// POST /create-requisition  { institution_id, institution_name, redirect_url }
// Creates a GoCardless end-user agreement + requisition (the "connect my
// bank" consent flow) and stores a pending bank_connections row. Returns the
// { link } to redirect the user to for the bank's OAuth consent screen.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, gcFetch, getAccessToken, jsonResponse } from '../_shared/gocardless.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const { institution_id, institution_name, redirect_url } = await req.json()
    if (!institution_id || !redirect_url) {
      return jsonResponse({ error: 'institution_id and redirect_url are required' }, 400)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    )
    const accessToken = await getAccessToken(supabaseAdmin)

    const agreement = await gcFetch('/agreements/enduser/', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        institution_id,
        max_historical_days: 730,
        access_valid_for_days: 90,
        access_scope: ['balances', 'details', 'transactions'],
      }),
    })

    const reference = crypto.randomUUID()
    const requisition = await gcFetch('/requisitions/', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        redirect: redirect_url,
        institution_id,
        reference,
        agreement: agreement.id,
      }),
    })

    const { error: insertError } = await supabaseAdmin.from('bank_connections').insert({
      institution_id,
      institution_name: institution_name ?? institution_id,
      reference,
      requisition_id: requisition.id,
      status: 'pending',
    })
    if (insertError) throw new Error(insertError.message)

    return jsonResponse({ link: requisition.link, requisition_id: requisition.id })
  } catch (err) {
    return jsonResponse({ error: err.message }, 500)
  }
})
