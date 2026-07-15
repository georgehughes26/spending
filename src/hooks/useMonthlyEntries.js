import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useMonthlyEntries(userId) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('monthly_entries')
      .select('*')
      .eq('user_id', userId)
      .order('month', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setEntries(data ?? [])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveEntry = useCallback(async (entry) => {
    const { error: upsertError } = await supabase
      .from('monthly_entries')
      .upsert({ ...entry, user_id: userId }, { onConflict: 'user_id,month' })

    if (upsertError) throw new Error(upsertError.message)
    await refresh()
  }, [userId, refresh])

  const deleteEntry = useCallback(async (id) => {
    const { error: deleteError } = await supabase
      .from('monthly_entries')
      .delete()
      .eq('id', id)

    if (deleteError) throw new Error(deleteError.message)
    await refresh()
  }, [refresh])

  return { entries, loading, error, saveEntry, deleteEntry, refresh }
}
