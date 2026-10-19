import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

  // Only the very first load should block the page behind "Loading…" --
  // every page gates its whole render on `loading`, so re-setting it true
  // on every refresh() call (including the one after each tick/edit) made
  // the entire page flash back to the loading placeholder on every single
  // interaction. A ref (not state) tracks this so flipping it doesn't
  // itself cause a re-render or change refresh's identity.
  const hasLoadedOnceRef = useRef(false)

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
    if (!hasLoadedOnceRef.current) setLoading(true)
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
      if (!hasLoadedOnceRef.current) setLoading(false)
      hasLoadedOnceRef.current = true
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const dailyLogsByDate = useMemo(() => Object.fromEntries(dailyLogs.map((l) => [l.date, l])), [dailyLogs])

  // Each mutator below re-fetches only the one slice it actually touched,
  // instead of refresh()'s full five-table reload -- a tick or a number
  // entry only ever changes dailyLogs, so refetching settings/template/
  // weekPlans/customHabits too was pure unnecessary network round-trips on
  // every interaction, on top of the loading-flag issue above.
  const refreshDailyLogs = useCallback(async () => {
    setDailyLogs(await db.fetchDailyLogs(userId))
  }, [userId])

  const saveSettings = useCallback(async (fields) => {
    await db.saveHabitSettings(userId, fields)
    setSettings(await db.fetchHabitSettings(userId))
  }, [userId])

  const saveTemplateDay = useCallback(async (weekday, fields) => {
    await db.saveTemplateDay(userId, weekday, fields)
    setTemplate(await db.fetchHabitTemplate(userId))
  }, [userId])

  const importWeekPlan = useCallback(async (plan) => {
    await db.importWeekPlan(userId, plan)
    setWeekPlans(await db.fetchWeekPlans(userId))
  }, [userId])

  const revertWeekPlan = useCallback(async (weekStart) => {
    await db.revertWeekPlan(userId, weekStart)
    setWeekPlans(await db.fetchWeekPlans(userId))
  }, [userId])

  const addCustomHabit = useCallback(async (habit) => {
    await db.addCustomHabit(userId, habit)
    setCustomHabits(await db.fetchCustomHabits(userId))
  }, [userId])

  const deleteCustomHabit = useCallback(async (id) => {
    await db.deleteCustomHabit(id)
    setCustomHabits(await db.fetchCustomHabits(userId))
  }, [userId])

  // Simple scalar fields (weight, calories, protein, steps, water, creatine,
  // vit_d, note) -- safe to upsert as a partial-looking payload since none
  // of these are jsonb columns. Drinks goes through setDrinks instead, since
  // it also needs to flip drinks_touched.
  const setLogField = useCallback(async (date, field, value) => {
    await db.saveDailyLog(userId, date, { [field]: value })
    await refreshDailyLogs()
  }, [userId, refreshDailyLogs])

  // drinks_touched distinguishes "never logged" from "explicitly logged as
  // 0" -- the drinks column itself defaults to 0 in the database, so it
  // alone can't tell the two apart once any other field on the day has
  // created the row.
  const setDrinks = useCallback(async (date, value) => {
    await db.saveDailyLog(userId, date, { drinks: value, drinks_touched: true })
    await refreshDailyLogs()
  }, [userId, refreshDailyLogs])

  // session_ticks is jsonb -- always write the full array, built from
  // whatever's already stored for that date.
  const toggleSessionTick = useCallback(async (date, index, sessionsLength) => {
    const existing = dailyLogsByDate[date]?.session_ticks ?? []
    const next = Array.from({ length: sessionsLength }, (_, i) => (i === index ? !existing[i] : !!existing[i]))
    await db.saveDailyLog(userId, date, { session_ticks: next })
    await refreshDailyLogs()
  }, [userId, dailyLogsByDate, refreshDailyLogs])

  // custom_values is jsonb too -- merge the one changed key over the rest.
  const setCustomValue = useCallback(async (date, habitId, value) => {
    const existing = dailyLogsByDate[date]?.custom_values ?? {}
    await db.saveDailyLog(userId, date, { custom_values: { ...existing, [habitId]: value } })
    await refreshDailyLogs()
  }, [userId, dailyLogsByDate, refreshDailyLogs])

  // lifts is jsonb too, but unlike session_ticks/custom_values it isn't
  // keyed against anything external (no plan to merge against) -- the lift
  // editor owns the whole day's array, so a full replace is correct here.
  const setLifts = useCallback(async (date, lifts) => {
    await db.saveDailyLog(userId, date, { lifts })
    await refreshDailyLogs()
  }, [userId, refreshDailyLogs])

  return {
    settings, template, weekPlans, customHabits, dailyLogs, dailyLogsByDate,
    loading, error, refresh,
    saveSettings, saveTemplateDay, importWeekPlan, revertWeekPlan,
    addCustomHabit, deleteCustomHabit, setLogField, setDrinks, toggleSessionTick, setCustomValue, setLifts,
  }
}
