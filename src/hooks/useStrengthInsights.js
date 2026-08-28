import { useCallback, useEffect, useState } from 'react'
import * as db from '../lib/strength/db'
import { exercisesNeedingAttention, overallProgression, rankProgression, rankRelativeStrength } from '../lib/strength/insights'

export function useStrengthInsights(userId) {
  const [profile, setProfile] = useState(null)
  const [exercises, setExercises] = useState([])
  const [setLogs, setSetLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      setExercises([])
      setSetLogs([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [p, ex, logs] = await Promise.all([
        db.getStrengthProfile(userId),
        db.getAllProgramExercises(userId),
        db.getAllSetLogsWithDates(userId),
      ])
      setProfile(p)
      setExercises(ex)
      setSetLogs(logs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveProfile = useCallback(
    async (fields) => {
      await db.upsertStrengthProfile(userId, fields)
      await refresh()
    },
    [userId, refresh],
  )

  const bodyweightKg = profile?.weight_kg ?? null

  return {
    profile,
    loading,
    error,
    saveProfile,
    progression: rankProgression(exercises, setLogs),
    overall: overallProgression(exercises, setLogs),
    relativeStrength: rankRelativeStrength(exercises, bodyweightKg),
    ...exercisesNeedingAttention(exercises, setLogs),
  }
}
