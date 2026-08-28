import { useCallback, useEffect, useState } from 'react'
import * as db from '../lib/running/db'

export function useRunningCompletedRuns(userId) {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setRuns([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setRuns(await db.getAllCompletedRuns(userId))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const deleteRun = useCallback(
    async (id) => {
      const plannedRunId = await db.deleteCompletedRun(userId, id)
      if (plannedRunId !== undefined) await db.markPlannedRunUpcoming(userId, plannedRunId)
      await refresh()
    },
    [userId, refresh],
  )

  return { runs, loading, error, deleteRun, refresh }
}
