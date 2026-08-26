const pad = (n) => String(n).padStart(2, '0')
const toDateString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseDateOnly = (dateString) => {
  const [y, m, d] = dateString.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function lastDayOfMonth(monthValue) {
  const [y, m] = monthValue.split('-').map(Number)
  const end = new Date(y, m, 0)
  return toDateString(end)
}

// Splits a date range into calendar weeks (Mon-Sun), clipped to the range's
// own bounds -- so the first/last bucket can be shorter than 7 days rather
// than spilling outside it. The range is usually payday-to-payday rather
// than a calendar month.
export function computeWeekBuckets(startDate, endDate) {
  const rangeStart = parseDateOnly(startDate)
  const rangeEnd = parseDateOnly(endDate)
  if (rangeEnd < rangeStart) return []

  const buckets = []
  let cursor = new Date(rangeStart)

  while (cursor <= rangeEnd) {
    const dayOfWeek = cursor.getDay() // 0 = Sun ... 6 = Sat
    const daysUntilSunday = (7 - dayOfWeek) % 7
    const weekEndCandidate = new Date(cursor)
    weekEndCandidate.setDate(cursor.getDate() + daysUntilSunday)
    const bucketEnd = weekEndCandidate < rangeEnd ? weekEndCandidate : rangeEnd

    buckets.push({ weekStart: toDateString(cursor), weekEnd: toDateString(bucketEnd) })

    cursor = new Date(bucketEnd)
    cursor.setDate(cursor.getDate() + 1)
  }

  return buckets
}

export function formatWeekRange(weekStart, weekEnd) {
  const start = new Date(weekStart)
  const end = new Date(weekEnd)
  const startDay = start.getDate()
  const endDay = end.getDate()
  const endMonth = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(end)

  if (start.getMonth() === end.getMonth()) {
    return `${startDay}–${endDay} ${endMonth}`
  }
  const startMonth = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(start)
  return `${startDay} ${startMonth} – ${endDay} ${endMonth}`
}
