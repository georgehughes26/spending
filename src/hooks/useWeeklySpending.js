import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { computeWeekBuckets } from '../utils/weeks'

export function aggregateWeeklySpending(weeks) {
  const totals = {}
  for (const week of weeks) {
    for (const [category, amount] of Object.entries(week.spending ?? {})) {
      totals[category] = (totals[category] ?? 0) + (Number(amount) || 0)
    }
  }
  return totals
}

export function useWeeklySpending(userId, monthValue, periodStart, periodEnd) {
  const [weeks, setWeeks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const buckets = useMemo(() => computeWeekBuckets(periodStart, periodEnd), [periodStart, periodEnd])

  const refresh = useCallback(async () => {
    if (!userId) {
      setWeeks([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('weekly_spending')
      .select('*')
      .eq('user_id', userId)
      .eq('month', `${monthValue}-01`)
      .order('week_start', { ascending: true })

    if (fetchError) setError(fetchError.message)
    else setWeeks(data ?? [])
    setLoading(false)
  }, [userId, monthValue])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveWeek = useCallback(async (weekStart, weekEnd, spending) => {
    const { error: upsertError } = await supabase
      .from('weekly_spending')
      .upsert(
        { user_id: userId, month: `${monthValue}-01`, week_start: weekStart, week_end: weekEnd, spending },
        { onConflict: 'user_id,month,week_start' },
      )
    if (upsertError) throw new Error(upsertError.message)
    await refresh()
  }, [userId, monthValue, refresh])

  return { buckets, weeks, loading, error, saveWeek, refresh }
}
