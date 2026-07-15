// POST /requisition-callback  { reference }
// Called by the frontend once the user is redirected back from their bank's
// consent screen (redirect_url?ref=<reference>). Looks up the requisition,
// confirms it's linked, and stores the resulting bank_accounts rows.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, gcFetch, getAccessToken, jsonResponse } from '../_shared/gocardless.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const { reference } = await req.json()
    if (!reference) return jsonResponse({ error: 'reference is required' }, 400)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    )

    const { data: connection, error: findError } = await supabaseAdmin
      .from('bank_connections')
      .select('*')
      .eq('reference', reference)
      .maybeSingle()
    if (findError) throw new Error(findError.message)
    if (!connection) return jsonResponse({ error: 'Unknown reference' }, 404)

    const accessToken = await getAccessToken(supabaseAdmin)
    const requisition = await gcFetch(`/requisitions/${connection.requisition_id}/`, accessToken)

    if (requisition.status !== 'LN') {
      await supabaseAdmin
        .from('bank_connections')
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('id', connection.id)
      return jsonResponse({ error: `Requisition not linked (status: ${requisition.status})` }, 400)
    }

    const accounts = []
    for (const accountId of requisition.accounts) {
      const details = await gcFetch(`/accounts/${accountId}/details/`, accessToken)
      const account = details.account ?? {}
      accounts.push({
        connection_id: connection.id,
        gc_account_id: accountId,
        iban: account.iban ?? null,
        display_name: account.name ?? account.product ?? connection.institution_name,
        currency: account.currency ?? 'GBP',
      })
    }

    if (accounts.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('bank_accounts')
        .upsert(accounts, { onConflict: 'gc_account_id' })
      if (upsertError) throw new Error(upsertError.message)
    }

    await supabaseAdmin
      .from('bank_connections')
      .update({ status: 'linked', updated_at: new Date().toISOString() })
      .eq('id', connection.id)

    return jsonResponse({ status: 'linked', accounts: accounts.length })
  } catch (err) {
    return jsonResponse({ error: err.message }, 500)
  }
})
