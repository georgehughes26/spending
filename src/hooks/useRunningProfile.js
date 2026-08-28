import { useCallback, useEffect, useState } from 'react'
import * as db from '../lib/running/db'
import { ensurePlanBootstrapped } from '../lib/running/bootstrap'
import { calibrateFromRuns } from '../lib/running/calibrate'
import { regenerateFuturePlan } from '../lib/running/generate'

export function useRunningProfile(userId) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      await ensurePlanBootstrapped(userId)
      setProfile(await db.getProfile(userId))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveSettings = useCallback(
    async (fields) => {
      await db.updateProfile(userId, fields)
      const currentWeek = (await db.getCurrentWeekNumber(userId)) ?? 1
      await regenerateFuturePlan(userId, currentWeek, fields.current_fitness_5k_equiv_seconds)
      await refresh()
    },
    [userId, refresh],
  )

  const calibrate = useCallback(
    async (input) => {
      const outcome = await calibrateFromRuns(userId, input)
      await refresh()
      return outcome
    },
    [userId, refresh],
  )

  return { profile, loading, error, saveSettings, calibrate, refresh }
}
