// POST /sync-transactions
// Pulls the latest transactions for every linked bank account, categorizes
// them using category_rules (keyword match against the description), and
// upserts them into bank_transactions. Safe to call repeatedly — dedupes on
// gc_transaction_id.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, gcFetch, getAccessToken, jsonResponse } from '../_shared/gocardless.ts'

function categorize(description, rules) {
  const lower = description.toLowerCase()
  const match = rules.find((r) => lower.includes(r.match_text.toLowerCase()))
  return match?.category ?? null
}

function transactionDescription(tx) {
  return tx.remittanceInformationUnstructured
    ?? (Array.isArray(tx.remittanceInformationUnstructuredArray) ? tx.remittanceInformationUnstructuredArray.join(' ') : null)
    ?? tx.creditorName
    ?? tx.debtorName
    ?? ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    )
    const accessToken = await getAccessToken(supabaseAdmin)

    const { data: accounts, error: accountsError } = await supabaseAdmin.from('bank_accounts').select('*')
    if (accountsError) throw new Error(accountsError.message)

    const { data: rules, error: rulesError } = await supabaseAdmin.from('category_rules').select('*')
    if (rulesError) throw new Error(rulesError.message)

    let totalSynced = 0
    const errors = []

    for (const account of accounts ?? []) {
      try {
        const data = await gcFetch(`/accounts/${account.gc_account_id}/transactions/`, accessToken)
        const booked = data.transactions?.booked ?? []

        const rows = booked.map((tx) => {
          const amount = Number(tx.transactionAmount?.amount ?? 0)
          const description = transactionDescription(tx)
          return {
            bank_account_id: account.id,
            gc_transaction_id: tx.transactionId ?? tx.internalTransactionId,
            booked_date: tx.bookingDate ?? tx.valueDate,
            amount,
            currency: tx.transactionAmount?.currency ?? account.currency,
            description,
            category: amount < 0 ? categorize(description, rules ?? []) : null,
            raw: tx,
          }
        }).filter((r) => r.gc_transaction_id && r.booked_date)

        if (rows.length > 0) {
          const { error: upsertError } = await supabaseAdmin
            .from('bank_transactions')
            .upsert(rows, { onConflict: 'gc_transaction_id', ignoreDuplicates: true })
          if (upsertError) throw new Error(upsertError.message)
          totalSynced += rows.length
        }
      } catch (err) {
        errors.push({ account: account.gc_account_id, error: err.message })
      }
    }

    return jsonResponse({ synced: totalSynced, accounts: (accounts ?? []).length, errors })
  } catch (err) {
    return jsonResponse({ error: err.message }, 500)
  }
})
