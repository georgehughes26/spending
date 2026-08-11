import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function currentMonthDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// costs apply from start_month onward, up to (but not including) end_month
// if it's set -- lets a cost start partway through history and/or stop
// without touching the months before it began or after it ended.
function isActiveInMonth(cost, monthDate) {
  if (cost.start_month > monthDate) return false
  if (cost.end_month && cost.end_month <= monthDate) return false
  return true
}

export function useFixedCosts(userId, monthValue) {
  const [costs, setCosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const monthDate = monthValue ? `${monthValue}-01` : currentMonthDate()

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
    const { error: insertError } = await supabase
      .from('fixed_costs')
      .insert({ user_id: userId, name, amount, start_month: monthDate })
    if (insertError) throw new Error(insertError.message)
    await refresh()
  }, [userId, monthDate, refresh])

  const updateCost = useCallback(async (id, { name, amount }) => {
    const { error: updateError } = await supabase.from('fixed_costs').update({ name, amount }).eq('id', id)
    if (updateError) throw new Error(updateError.message)
    await refresh()
  }, [refresh])

  // Stops the cost from the viewed month onward -- months before it keep it.
  const endCost = useCallback(async (id) => {
    const { error: updateError } = await supabase.from('fixed_costs').update({ end_month: monthDate }).eq('id', id)
    if (updateError) throw new Error(updateError.message)
    await refresh()
  }, [monthDate, refresh])

  // Removes the cost entirely, including from past months -- for fixing a
  // mistake, not for stopping a cost going forward (use endCost for that).
  const deleteCost = useCallback(async (id) => {
    const { error: deleteError } = await supabase.from('fixed_costs').delete().eq('id', id)
    if (deleteError) throw new Error(deleteError.message)
    await refresh()
  }, [refresh])

  const activeCosts = useMemo(
    () => costs.filter((c) => isActiveInMonth(c, monthDate)),
    [costs, monthDate],
  )
  const total = activeCosts.reduce((t, c) => t + (Number(c.amount) || 0), 0)

  return {
    costs,
    activeCosts,
    total,
    loading,
    error,
    addCost,
    updateCost,
    endCost,
    deleteCost,
    refresh,
  }
}
