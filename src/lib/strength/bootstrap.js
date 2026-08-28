import { createPlannedSession, createWeek, getLatestWeek, getProgramDays, getWeekByStartDate } from './db'

function todayIso() {
  // Local calendar date -- what day it actually is for the user -- read
  // directly from local fields rather than through an ISO/UTC round trip.
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Pure calendar-date arithmetic, anchored in UTC throughout so a date
// string never gets reinterpreted through the local timezone and shifted
// by a day (parsing "2026-08-24T00:00:00" as *local* midnight, then
// re-serializing via toISOString's UTC output, silently loses a day in any
// timezone ahead of UTC -- e.g. UK summer time). Once a date is a string,
// everything here stays UTC-only; todayIso() above is the one and only
// place a local clock reading happens.
function addDays(dateIso, days) {
  const d = new Date(`${dateIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function mondayOf(dateIso) {
  const d = new Date(`${dateIso}T00:00:00Z`)
  const day = d.getUTCDay() // 0 = Sunday .. 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day
  return addDays(dateIso, diff)
}

export function currentWeekStartDate() {
  return mondayOf(todayIso())
}

async function createWeekWithSessions(userId, startDate) {
  const week = await createWeek(userId, startDate)
  const days = await getProgramDays(userId)
  for (const day of days) {
    await createPlannedSession(userId, { week_id: week.id, day_id: day.id })
  }
  return week
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
  const existing = await getWeekByStartDate(userId, startDate)
  return existing ?? createWeekWithSessions(userId, startDate)
}

/**
 * The week actually shown on the dashboard -- the most recently created
 * one, not strictly "today's calendar week". Ordinarily those are the same
 * thing (ensureCurrentStrengthWeek only creates today's week), but once
 * startNextWeek has been used to move on early, the latest *created* week
 * can be ahead of today's actual calendar week, and that's the one that
 * should show.
 */
export async function getDisplayWeek(userId) {
  return getLatestWeek(userId)
}

/**
 * Manually moves on to the week after the given one, before the calendar
 * would otherwise generate it -- for finishing everything ahead of
 * schedule rather than being stuck waiting for Monday.
 */
export async function startNextWeek(userId, afterStartDate) {
  const nextStart = addDays(afterStartDate, 7)
  const existing = await getWeekByStartDate(userId, nextStart)
  return existing ?? createWeekWithSessions(userId, nextStart)
}
