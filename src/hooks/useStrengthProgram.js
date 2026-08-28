import { useCallback, useEffect, useState } from 'react'
import * as db from '../lib/strength/db'

/** Program days, each with its exercises nested in -- the whole editable program in one shape. */
export function useStrengthProgram(userId) {
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setDays([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [dayRows, exerciseRows] = await Promise.all([db.getProgramDays(userId), db.getAllProgramExercises(userId)])
      setDays(dayRows.map((d) => ({ ...d, exercises: exerciseRows.filter((e) => e.day_id === d.id) })))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addDay = useCallback(
    async (label, isOptional = false) => {
      await db.createDay(userId, { label, is_optional: isOptional, sort_order: days.length })
      await refresh()
    },
    [userId, days.length, refresh],
  )

  const removeDay = useCallback(
    async (dayId) => {
      await db.deleteDay(userId, dayId)
      await refresh()
    },
    [userId, refresh],
  )

  const addExercise = useCallback(
    async (dayId, fields) => {
      const day = days.find((d) => d.id === dayId)
      await db.createExercise(userId, { day_id: dayId, sort_order: day?.exercises.length ?? 0, ...fields })
      await refresh()
    },
    [userId, days, refresh],
  )

  const updateExercise = useCallback(
    async (exerciseId, fields) => {
      await db.updateExercise(userId, exerciseId, fields)
      await refresh()
    },
    [userId, refresh],
  )

  const removeExercise = useCallback(
    async (exerciseId) => {
      await db.deleteExercise(userId, exerciseId)
      await refresh()
    },
    [userId, refresh],
  )

  return { days, loading, error, addDay, removeDay, addExercise, updateExercise, removeExercise, refresh }
}
