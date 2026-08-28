import { useCallback, useEffect, useState } from 'react'
import * as db from '../lib/strength/db'
import { ensureCurrentStrengthWeek } from '../lib/strength/bootstrap'

/** This week's (WC <date>) planned sessions, one per current program day, plus whatever's been logged against each so far. */
export function useStrengthWeek(userId) {
  const [week, setWeek] = useState(null)
  const [plannedSessions, setPlannedSessions] = useState([])
  const [sessionsByPlanned, setSessionsByPlanned] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setWeek(null)
      setPlannedSessions([])
      setSessionsByPlanned({})
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const w = await ensureCurrentStrengthWeek(userId)
      const planned = await db.getPlannedSessionsForWeek(userId, w.id)
      const sessions = await db.getSessionsByPlannedSessionIds(userId, planned.map((p) => p.id))
      const map = {}
      for (const s of sessions) map[s.planned_session_id] = s
      setWeek(w)
      setPlannedSessions(planned)
      setSessionsByPlanned(map)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const markDoneNoFile = useCallback(
    async (plannedSessionId) => {
      const planned = plannedSessions.find((p) => p.id === plannedSessionId)
      if (!planned) return
      await db.createSession(userId, {
        day_id: planned.day_id,
        planned_session_id: plannedSessionId,
        session_date: new Date().toISOString().slice(0, 10),
        source: 'manual',
      })
      await db.markPlannedSessionStatus(userId, plannedSessionId, 'completed')
      await refresh()
    },
    [userId, plannedSessions, refresh],
  )

  const skip = useCallback(
    async (plannedSessionId) => {
      await db.markPlannedSessionStatus(userId, plannedSessionId, 'skipped')
      await refresh()
    },
    [userId, refresh],
  )

  const unskip = useCallback(
    async (plannedSessionId) => {
      await db.markPlannedSessionStatus(userId, plannedSessionId, 'upcoming')
      await refresh()
    },
    [userId, refresh],
  )

  return { week, plannedSessions, sessionsByPlanned, loading, error, markDoneNoFile, skip, unskip, refresh }
}
