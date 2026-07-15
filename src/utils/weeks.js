const pad = (n) => String(n).padStart(2, '0')
const toDateString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Splits a month into calendar weeks (Mon-Sun), clipped to the month's own
// days — so the first/last bucket can be shorter than 7 days rather than
// spilling into the neighbouring month.
export function computeWeekBuckets(monthValue) {
  const [y, m] = monthValue.split('-').map(Number)
  const monthStart = new Date(y, m - 1, 1)
  const monthEnd = new Date(y, m, 0)

  const buckets = []
  let cursor = new Date(monthStart)

  while (cursor <= monthEnd) {
    const dayOfWeek = cursor.getDay() // 0 = Sun ... 6 = Sat
    const daysUntilSunday = (7 - dayOfWeek) % 7
    const weekEndCandidate = new Date(cursor)
    weekEndCandidate.setDate(cursor.getDate() + daysUntilSunday)
    const bucketEnd = weekEndCandidate < monthEnd ? weekEndCandidate : monthEnd

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
