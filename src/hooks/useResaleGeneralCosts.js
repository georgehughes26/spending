import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// General resale-business costs that aren't tied to one item -- packaging,
// a Vinted subscription, printer ink. Added the same lightweight way as a
// stock item, just without any purchase/sale lifecycle attached.
export function useResaleGeneralCosts(userId) {
  const [costs, setCosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setCosts([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('resale_general_costs')
      .select('*')
      .eq('user_id', userId)
      .order('cost_date', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else setCosts(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addCost = useCallback(async (label, amount, costDate, boughtFrom) => {
    const { error: insertError } = await supabase
      .from('resale_general_costs')
      .insert({ user_id: userId, label, amount, cost_date: costDate || new Date().toISOString().slice(0, 10), bought_from: boughtFrom || null })
    if (insertError) throw new Error(insertError.message)
    await refresh()
  }, [userId, refresh])

  const updateCost = useCallback(async (id, fields) => {
    const { error: updateError } = await supabase.from('resale_general_costs').update(fields).eq('id', id)
    if (updateError) throw new Error(updateError.message)
    await refresh()
  }, [refresh])

  const deleteCost = useCallback(async (id) => {
    const { error: deleteError } = await supabase.from('resale_general_costs').delete().eq('id', id)
    if (deleteError) throw new Error(deleteError.message)
    await refresh()
  }, [refresh])

  return { costs, loading, error, addCost, updateCost, deleteCost, refresh }
}
