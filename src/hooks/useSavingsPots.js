import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useSavingsPots(userId) {
  const [pots, setPots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setPots([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('savings_pots')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (fetchError) setError(fetchError.message)
    else setPots(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addPot = useCallback(async (pot) => {
    const { error: insertError } = await supabase.from('savings_pots').insert({
      user_id: userId,
      name: pot.name,
      percentage: pot.percentage,
      starting_balance: pot.startingBalance ?? 0,
      target: pot.target ?? null,
      target_date: pot.targetDate ?? null,
      sort_order: pots.length,
    })
    if (insertError) throw new Error(insertError.message)
    await refresh()
  }, [userId, pots.length, refresh])

  const updatePot = useCallback(async (id, pot) => {
    const { error: updateError } = await supabase
      .from('savings_pots')
      .update({
        name: pot.name,
        percentage: pot.percentage,
        starting_balance: pot.startingBalance,
        target: pot.target,
        target_date: pot.targetDate,
      })
      .eq('id', id)
    if (updateError) throw new Error(updateError.message)
    await refresh()
  }, [refresh])

  const deletePot = useCallback(async (id) => {
    const { error: deleteError } = await supabase.from('savings_pots').delete().eq('id', id)
    if (deleteError) throw new Error(deleteError.message)
    await refresh()
  }, [refresh])

  return { pots, loading, error, addPot, updatePot, deletePot, refresh }
}
