import { supabase } from '../supabaseClient'
import { BUILT_IN_SETTINGS, DEFAULT_TEMPLATE, SEED_WEEK_PLAN } from './seed'
import { normalizeWeekPlanDays } from './weekPlan'

export async function fetchHabitSettings(userId) {
  const { data, error } = await supabase.from('habit_settings').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  if (data) return data

  const seeded = { user_id: userId, ...BUILT_IN_SETTINGS }
  const { error: insertError } = await supabase.from('habit_settings').insert(seeded)
  if (insertError) throw new Error(insertError.message)
  return seeded
}

export async function saveHabitSettings(userId, fields) {
  const { error } = await supabase.from('habit_settings').upsert({ user_id: userId, ...fields }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
}

export async function fetchHabitTemplate(userId) {
  const { data, error } = await supabase.from('habit_day_templates').select('*').eq('user_id', userId).order('weekday')
  if (error) throw new Error(error.message)
  if (data && data.length === 7) return data

  const seeded = DEFAULT_TEMPLATE.map((row) => ({ user_id: userId, ...row }))
  const { error: insertError } = await supabase.from('habit_day_templates').upsert(seeded, { onConflict: 'user_id,weekday' })
  if (insertError) throw new Error(insertError.message)
  return seeded
}

export async function saveTemplateDay(userId, weekday, fields) {
  const { error } = await supabase
    .from('habit_day_templates')
    .upsert({ user_id: userId, weekday, ...fields }, { onConflict: 'user_id,weekday' })
  if (error) throw new Error(error.message)
}

export async function fetchWeekPlans(userId) {
  const { data, error } = await supabase.from('habit_week_plans').select('*').eq('user_id', userId).order('week_start')
  if (error) throw new Error(error.message)

  if (!data || data.length === 0) {
    await importWeekPlan(userId, SEED_WEEK_PLAN)
    return fetchWeekPlans(userId)
  }
  return data
}

// Caller must have already validated `plan` -- this just normalizes and
// upserts. Re-importing the same week_start replaces the row entirely.
export async function importWeekPlan(userId, plan) {
  const row = {
    user_id: userId,
    week_start: plan.week_start,
    summary: plan.summary ?? null,
    days: normalizeWeekPlanDays(plan),
    raw_json: plan,
  }
  const { error } = await supabase.from('habit_week_plans').upsert(row, { onConflict: 'user_id,week_start' })
  if (error) throw new Error(error.message)
}

export async function revertWeekPlan(userId, weekStart) {
  const { error } = await supabase.from('habit_week_plans').delete().eq('user_id', userId).eq('week_start', weekStart)
  if (error) throw new Error(error.message)
}

export async function fetchCustomHabits(userId) {
  const { data, error } = await supabase
    .from('habit_custom_definitions')
    .select('*')
    .eq('user_id', userId)
    .eq('archived', false)
    .order('sort_order')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function addCustomHabit(userId, { label, type, target, unit, quickAdd }) {
  const key = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
  const { error } = await supabase.from('habit_custom_definitions').insert({
    user_id: userId,
    key,
    label: label.trim(),
    type,
    target: target ?? null,
    unit: unit ?? null,
    quick_add: quickAdd ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function deleteCustomHabit(id) {
  const { error } = await supabase.from('habit_custom_definitions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function fetchDailyLogs(userId) {
  const { data, error } = await supabase.from('habit_daily_logs').select('*').eq('user_id', userId).order('date')
  if (error) throw new Error(error.message)
  return data ?? []
}

// Full-row upsert -- callers always pass the complete record (merging
// jsonb/array fields over the existing row themselves first), since a
// partial payload would otherwise wholesale-replace session_ticks or
// custom_values instead of merging into them.
export async function saveDailyLog(userId, date, fields) {
  const { error } = await supabase.from('habit_daily_logs').upsert({ user_id: userId, date, ...fields }, { onConflict: 'user_id,date' })
  if (error) throw new Error(error.message)
}

export async function exportAllTrainingData(userId) {
  const [settings, template, weekPlans, customHabits, dailyLogs] = await Promise.all([
    fetchHabitSettings(userId),
    fetchHabitTemplate(userId),
    fetchWeekPlans(userId),
    fetchCustomHabits(userId),
    fetchDailyLogs(userId),
  ])
  return { exported_at: new Date().toISOString(), settings, template, weekPlans, customHabits, dailyLogs }
}

export async function importAllTrainingData(userId, backup) {
  if (backup.settings) await saveHabitSettings(userId, backup.settings)
  for (const row of backup.template ?? []) await saveTemplateDay(userId, row.weekday, row)
  for (const plan of backup.weekPlans ?? []) {
    await supabase.from('habit_week_plans').upsert({ ...plan, user_id: userId }, { onConflict: 'user_id,week_start' })
  }
  for (const habit of backup.customHabits ?? []) {
    await supabase.from('habit_custom_definitions').upsert({ ...habit, user_id: userId }, { onConflict: 'id' })
  }
  for (const log of backup.dailyLogs ?? []) {
    await supabase.from('habit_daily_logs').upsert({ ...log, user_id: userId }, { onConflict: 'user_id,date' })
  }
}
