// Every date in this module is a plain 'YYYY-MM-DD' string, parsed as UTC
// midnight -- habit logging is per calendar day, not per instant, so there's
// no timezone math to get right, only to avoid introducing.

export function toISODate(date) {
  return date.toISOString().slice(0, 10)
}

export function parseISODate(dateString) {
  return new Date(`${dateString}T00:00:00Z`)
}

export function todayISODate() {
  return toISODate(new Date())
}

export function addDays(dateString, days) {
  const d = parseISODate(dateString)
  d.setUTCDate(d.getUTCDate() + days)
  return toISODate(d)
}

// Monday of the week containing dateString -- weeks run Mon-Sun throughout
// this feature, matching how the coach hands over a plan each Sunday.
export function weekStartFor(dateString) {
  const d = parseISODate(dateString)
  const day = d.getUTCDay() // 0 = Sun .. 6 = Sat
  const diff = day === 0 ? -6 : 1 - day
  return addDays(dateString, diff)
}

export function weekDatesFor(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

// 0 = Monday .. 6 = Sunday, matching the default template's weekday key.
export function weekdayIndex(dateString) {
  const day = parseISODate(dateString).getUTCDay()
  return (day + 6) % 7
}

export function isMonday(dateString) {
  return parseISODate(dateString).getUTCDay() === 1
}

// "Mon 12" -- used in the check-in export's daily table.
export function formatShortDay(dateString) {
  const d = parseISODate(dateString)
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(d)
  return `${weekday} ${d.getUTCDate()}`
}

// "Sat 19 Dec 2026"
export function formatLongDay(dateString) {
  const d = parseISODate(dateString)
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d)
}

// "12 Oct"
export function formatDayMonth(dateString) {
  const d = parseISODate(dateString)
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d)
}

// Which plan week a date falls in (1-indexed) and how many weeks the plan
// runs in total, counting whole Mon-Sun weeks from planStart's week to
// goalDate's week inclusive.
export function weekNumberFor(dateString, planStart) {
  const diffDays = (parseISODate(weekStartFor(dateString)) - parseISODate(weekStartFor(planStart))) / 86400000
  return Math.round(diffDays / 7) + 1
}

export function totalWeeksFor(planStart, goalDate) {
  return weekNumberFor(goalDate, planStart)
}
