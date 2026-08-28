import { createPlannedSession, createWeek, getProgramDays, getWeekByStartDate } from './db'

function mondayOf(date) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday .. 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function currentWeekStartDate() {
  return mondayOf(new Date())
}

/**
 * Ensures this week (WC = the most recent Monday) exists and has one
 * planned session per program day as it stands right now -- generated once,
 * on first visit that week, same as Running only prescribes each week once.
 * A day added mid-week won't retroactively appear in a week already
 * generated; it'll show up starting the following week.
 */
export async function ensureCurrentStrengthWeek(userId) {
  const startDate = currentWeekStartDate()
  let week = await getWeekByStartDate(userId, startDate)
  if (!week) {
    week = await createWeek(userId, startDate)
    const days = await getProgramDays(userId)
    for (const day of days) {
      await createPlannedSession(userId, { week_id: week.id, day_id: day.id })
    }
  }
  return week
}
