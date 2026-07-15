import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useFixedCosts(userId) {
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
      .from('fixed_costs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (fetchError) setError(fetchError.message)
    else setCosts(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addCost = useCallback(async (name, amount) => {
    const { error: insertError } = await supabase.from('fixed_costs').insert({ user_id: userId, name, amount })
    if (insertError) throw new Error(insertError.message)
    await refresh()
  }, [userId, refresh])

  const updateCost = useCallback(async (id, { name, amount }) => {
    const { error: updateError } = await supabase.from('fixed_costs').update({ name, amount }).eq('id', id)
    if (updateError) throw new Error(updateError.message)
    await refresh()
  }, [refresh])

  const deleteCost = useCallback(async (id) => {
    const { error: deleteError } = await supabase.from('fixed_costs').delete().eq('id', id)
    if (deleteError) throw new Error(deleteError.message)
    await refresh()
  }, [refresh])

  const total = costs.reduce((t, c) => t + (Number(c.amount) || 0), 0)

  return { costs, total, loading, error, addCost, updateCost, deleteCost, refresh }
}
