// Shared helpers for talking to the GoCardless Bank Account Data API
// (https://developer.gocardless.com/bank-account-data/overview) from Edge
// Functions. Tokens are cached in the `gc_tokens` singleton row so we don't
// hit GoCardless's token-creation rate limit on every request.

const GC_BASE = 'https://bankaccountdata.gocardless.com/api/v2'

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  }
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}

async function requestNewToken() {
  const secretId = Deno.env.get('GOCARDLESS_SECRET_ID')
  const secretKey = Deno.env.get('GOCARDLESS_SECRET_KEY')
  if (!secretId || !secretKey) {
    throw new Error('Missing GOCARDLESS_SECRET_ID / GOCARDLESS_SECRET_KEY function secrets')
  }

  const res = await fetch(`${GC_BASE}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
  })
  if (!res.ok) throw new Error(`GoCardless token/new failed: ${res.status} ${await res.text()}`)
  return res.json()
}

async function refreshToken(refresh) {
  const res = await fetch(`${GC_BASE}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!res.ok) return null
  return res.json()
}

// Returns a valid access token, refreshing/creating as needed, and persists
// it to gc_tokens via the given Supabase admin client.
export async function getAccessToken(supabaseAdmin) {
  const { data: row } = await supabaseAdmin.from('gc_tokens').select('*').eq('id', 1).maybeSingle()
  const now = Date.now()

  if (row?.access_token && row.access_expires_at && new Date(row.access_expires_at).getTime() > now + 60_000) {
    return row.access_token
  }

  if (row?.refresh_token && row.refresh_expires_at && new Date(row.refresh_expires_at).getTime() > now + 60_000) {
    const refreshed = await refreshToken(row.refresh_token)
    if (refreshed) {
      const access_expires_at = new Date(now + refreshed.access_expires * 1000).toISOString()
      await supabaseAdmin.from('gc_tokens').upsert({
        id: 1,
        access_token: refreshed.access,
        access_expires_at,
        refresh_token: row.refresh_token,
        refresh_expires_at: row.refresh_expires_at,
        updated_at: new Date().toISOString(),
      })
      return refreshed.access
    }
  }

  const fresh = await requestNewToken()
  const access_expires_at = new Date(now + fresh.access_expires * 1000).toISOString()
  const refresh_expires_at = new Date(now + fresh.refresh_expires * 1000).toISOString()
  await supabaseAdmin.from('gc_tokens').upsert({
    id: 1,
    access_token: fresh.access,
    access_expires_at,
    refresh_token: fresh.refresh,
    refresh_expires_at,
    updated_at: new Date().toISOString(),
  })
  return fresh.access
}

export async function gcFetch(path, accessToken, options = {}) {
  const res = await fetch(`${GC_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`GoCardless ${path} failed: ${res.status} ${await res.text()}`)
  return res.json()
}
