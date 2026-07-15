import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useSpendingCategories(userId) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setCategories([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('spending_categories')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (fetchError) setError(fetchError.message)
    else setCategories(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addCategory = useCallback(async (name) => {
    const { error: insertError } = await supabase
      .from('spending_categories')
      .insert({ user_id: userId, name, sort_order: categories.length })
    if (insertError) throw new Error(insertError.message)
    await refresh()
  }, [userId, categories.length, refresh])

  const renameCategory = useCallback(async (id, name) => {
    const { error: updateError } = await supabase.from('spending_categories').update({ name }).eq('id', id)
    if (updateError) throw new Error(updateError.message)
    await refresh()
  }, [refresh])

  const deleteCategory = useCallback(async (id) => {
    const { error: deleteError } = await supabase.from('spending_categories').delete().eq('id', id)
    if (deleteError) throw new Error(deleteError.message)
    await refresh()
  }, [refresh])

  return { categories, loading, error, addCategory, renameCategory, deleteCategory, refresh }
}
