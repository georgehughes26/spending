import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useBankData() {
  const [connections, setConnections] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [{ data: connectionsData, error: connectionsError }, { data: txData, error: txError }] = await Promise.all([
      supabase.from('bank_connections').select('*').order('created_at', { ascending: false }),
      supabase
        .from('bank_transactions')
        .select('*, bank_accounts(display_name, connection_id)')
        .order('booked_date', { ascending: false })
        .limit(500),
    ])

    if (connectionsError) setError(connectionsError.message)
    else if (txError) setError(txError.message)
    else {
      setConnections(connectionsData ?? [])
      setTransactions(txData ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const listInstitutions = useCallback(async (country = 'GB') => {
    const { data, error: fnError } = await supabase.functions.invoke('list-institutions', { body: { country } })
    if (fnError) throw new Error(fnError.message)
    if (data?.error) throw new Error(data.error)
    return data
  }, [])

  const connectBank = useCallback(async (institution, redirectUrl) => {
    const { data, error: fnError } = await supabase.functions.invoke('create-requisition', {
      body: {
        institution_id: institution.id,
        institution_name: institution.name,
        redirect_url: redirectUrl,
      },
    })
    if (fnError) throw new Error(fnError.message)
    if (data?.error) throw new Error(data.error)
    return data
  }, [])

  const completeConnection = useCallback(async (reference) => {
    const { data, error: fnError } = await supabase.functions.invoke('requisition-callback', {
      body: { reference },
    })
    if (fnError) throw new Error(fnError.message)
    if (data?.error) throw new Error(data.error)
    return data
  }, [])

  const syncTransactions = useCallback(async () => {
    const { data, error: fnError } = await supabase.functions.invoke('sync-transactions')
    if (fnError) throw new Error(fnError.message)
    if (data?.error) throw new Error(data.error)
    await refresh()
    return data
  }, [refresh])

  const updateTransactionCategory = useCallback(async (id, category) => {
    const { error: updateError } = await supabase.from('bank_transactions').update({ category }).eq('id', id)
    if (updateError) throw new Error(updateError.message)
    await refresh()
  }, [refresh])

  return {
    connections,
    transactions,
    loading,
    error,
    refresh,
    listInstitutions,
    connectBank,
    completeConnection,
    syncTransactions,
    updateTransactionCategory,
  }
}
