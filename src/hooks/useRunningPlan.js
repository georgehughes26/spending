import { useCallback, useEffect, useState } from 'react'
import * as db from '../lib/running/db'
import { processRunUpload } from '../lib/running/upload'

export function useRunningPlan(userId) {
  const [weeks, setWeeks] = useState([])
  const [runs, setRuns] = useState([])
  const [completedSummaries, setCompletedSummaries] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setWeeks([])
      setRuns([])
      setCompletedSummaries({})
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [w, r, s] = await Promise.all([
        db.getAllPlanWeeks(userId),
        db.getAllPlannedRuns(userId),
        db.getCompletedRunSummariesByPlannedRunId(userId),
      ])
      setWeeks(w)
      setRuns(r)
      setCompletedSummaries(s)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const markDone = useCallback(
    async (plannedRunId) => {
      await db.markPlannedRunCompletedManually(userId, plannedRunId)
      await refresh()
    },
    [userId, refresh],
  )

  const skip = useCallback(
    async (plannedRunId) => {
      await db.markPlannedRunSkipped(userId, plannedRunId)
      await refresh()
    },
    [userId, refresh],
  )

  const unskip = useCallback(
    async (plannedRunId) => {
      await db.unskipPlannedRun(userId, plannedRunId)
      await refresh()
    },
    [userId, refresh],
  )

  const uploadRun = useCallback(
    async (content, fileName, plannedRunId) => {
      const outcome = await processRunUpload(userId, content, fileName, plannedRunId)
      await refresh()
      return outcome
    },
    [userId, refresh],
  )

  return { weeks, runs, completedSummaries, loading, error, markDone, skip, unskip, uploadRun, refresh }
}
