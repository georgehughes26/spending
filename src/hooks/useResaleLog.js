import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// A simple dated log for the reselling business (mileage, hours worked) --
// same load/add/edit/remove shape as useResaleGeneralCosts, just pointed at
// whichever table the log lives in. Newest first.
export function useResaleLog(userId, table, dateField) {
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
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order(dateField, { ascending: false })
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else setEntries(data ?? [])
    setLoading(false)
  }, [userId, table, dateField])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addEntry = useCallback(async (fields) => {
    const { error: insertError } = await supabase.from(table).insert({ user_id: userId, ...fields })
    if (insertError) throw new Error(insertError.message)
    await refresh()
  }, [userId, table, refresh])

  const updateEntry = useCallback(async (id, fields) => {
    const { error: updateError } = await supabase.from(table).update(fields).eq('id', id)
    if (updateError) throw new Error(updateError.message)
    await refresh()
  }, [table, refresh])

  const deleteEntry = useCallback(async (id) => {
    const { error: deleteError } = await supabase.from(table).delete().eq('id', id)
    if (deleteError) throw new Error(deleteError.message)
    await refresh()
  }, [table, refresh])

  return { entries, loading, error, addEntry, updateEntry, deleteEntry, refresh }
}
