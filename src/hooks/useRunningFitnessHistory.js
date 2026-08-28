import { useCallback, useEffect, useState } from 'react'
import * as db from '../lib/running/db'

export function useRunningFitnessHistory(userId) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) {
      setHistory([])
      setLoading(false)
      return
    }
    setLoading(true)
    setHistory(await db.getFitnessHistory(userId))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { history, loading, refresh }
}
