import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useResaleItems(userId) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('resale_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else setItems(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addItem = useCallback(async (fields) => {
    const { error: insertError } = await supabase.from('resale_items').insert({ user_id: userId, ...fields })
    if (insertError) throw new Error(insertError.message)
    await refresh()
  }, [userId, refresh])

  const updateItem = useCallback(async (id, fields) => {
    const { error: updateError } = await supabase.from('resale_items').update(fields).eq('id', id)
    if (updateError) throw new Error(updateError.message)
    await refresh()
  }, [refresh])

  const deleteItem = useCallback(async (id) => {
    const { error: deleteError } = await supabase.from('resale_items').delete().eq('id', id)
    if (deleteError) throw new Error(deleteError.message)
    await refresh()
  }, [refresh])

  const markListed = useCallback(
    (id) => updateItem(id, { status: 'listed', listed_date: new Date().toISOString().slice(0, 10) }),
    [updateItem],
  )

  const markSold = useCallback(
    (id, soldPrice, soldDate, shippingOut, soldOn) =>
      updateItem(id, {
        status: 'sold',
        payment_status: 'awaiting_payment',
        shipping_status: 'not_shipped',
        sold_price: soldPrice,
        sold_date: soldDate || new Date().toISOString().slice(0, 10),
        shipping_out: shippingOut || null,
        sold_on: soldOn || null,
      }),
    [updateItem],
  )

  const markPaid = useCallback((id) => updateItem(id, { payment_status: 'paid' }), [updateItem])

  const markShipped = useCallback((id) => updateItem(id, { shipping_status: 'shipped' }), [updateItem])

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    markListed,
    markSold,
    markPaid,
    markShipped,
    refresh,
  }
}
