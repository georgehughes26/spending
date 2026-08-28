import { useCallback, useEffect, useState } from 'react'
import * as db from '../lib/strength/db'

export function useStrengthSessions(userId) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setSessions([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setSessions(await db.getAllSessions(userId))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const deleteSession = useCallback(
    async (id) => {
      await db.deleteSession(userId, id)
      await refresh()
    },
    [userId, refresh],
  )

  return { sessions, loading, error, deleteSession, refresh }
}
