import { useCallback, useEffect, useMemo, useState } from 'react'
import * as db from '../lib/habits/db'

// One hook owns every mutation to habit_daily_logs so the jsonb-merge rule
// for session_ticks/custom_values lives in exactly one place -- spreading
// the existing row's jsonb column before writing is what the spending
// feature's account_balances bug (earlier in this project) teaches: a
// partial jsonb payload replaces the whole column, it doesn't merge keys.
export function useTrainingData(userId) {
  const [settings, setSettings] = useState(null)
  const [template, setTemplate] = useState([])
  const [weekPlans, setWeekPlans] = useState([])
  const [customHabits, setCustomHabits] = useState([])
  const [dailyLogs, setDailyLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setSettings(null)
      setTemplate([])
      setWeekPlans([])
      setCustomHabits([])
      setDailyLogs([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [s, t, wp, ch, dl] = await Promise.all([
        db.fetchHabitSettings(userId),
        db.fetchHabitTemplate(userId),
        db.fetchWeekPlans(userId),
        db.fetchCustomHabits(userId),
        db.fetchDailyLogs(userId),
      ])
      setSettings(s)
      setTemplate(t)
      setWeekPlans(wp)
      setCustomHabits(ch)
      setDailyLogs(dl)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const dailyLogsByDate = useMemo(() => Object.fromEntries(dailyLogs.map((l) => [l.date, l])), [dailyLogs])

  const saveSettings = useCallback(async (fields) => {
    await db.saveHabitSettings(userId, fields)
    await refresh()
  }, [userId, refresh])

  const saveTemplateDay = useCallback(async (weekday, fields) => {
    await db.saveTemplateDay(userId, weekday, fields)
    await refresh()
  }, [userId, refresh])

  const importWeekPlan = useCallback(async (plan) => {
    await db.importWeekPlan(userId, plan)
    await refresh()
  }, [userId, refresh])

  const revertWeekPlan = useCallback(async (weekStart) => {
    await db.revertWeekPlan(userId, weekStart)
    await refresh()
  }, [userId, refresh])

  const addCustomHabit = useCallback(async (habit) => {
    await db.addCustomHabit(userId, habit)
    await refresh()
  }, [userId, refresh])

  const deleteCustomHabit = useCallback(async (id) => {
    await db.deleteCustomHabit(id)
    await refresh()
  }, [refresh])

  // Simple scalar fields (weight, calories, protein, steps, water, drinks,
  // creatine, vit_d, note) -- safe to upsert as a partial-looking payload
  // since none of these are jsonb columns.
  const setLogField = useCallback(async (date, field, value) => {
    await db.saveDailyLog(userId, date, { [field]: value })
    await refresh()
  }, [userId, refresh])

  // session_ticks is jsonb -- always write the full array, built from
  // whatever's already stored for that date.
  const toggleSessionTick = useCallback(async (date, index, sessionsLength) => {
    const existing = dailyLogsByDate[date]?.session_ticks ?? []
    const next = Array.from({ length: sessionsLength }, (_, i) => (i === index ? !existing[i] : !!existing[i]))
    await db.saveDailyLog(userId, date, { session_ticks: next })
    await refresh()
  }, [userId, dailyLogsByDate, refresh])

  // custom_values is jsonb too -- merge the one changed key over the rest.
  const setCustomValue = useCallback(async (date, habitId, value) => {
    const existing = dailyLogsByDate[date]?.custom_values ?? {}
    await db.saveDailyLog(userId, date, { custom_values: { ...existing, [habitId]: value } })
    await refresh()
  }, [userId, dailyLogsByDate, refresh])

  return {
    settings, template, weekPlans, customHabits, dailyLogs, dailyLogsByDate,
    loading, error, refresh,
    saveSettings, saveTemplateDay, importWeekPlan, revertWeekPlan,
    addCustomHabit, deleteCustomHabit, setLogField, toggleSessionTick, setCustomValue,
  }
}
