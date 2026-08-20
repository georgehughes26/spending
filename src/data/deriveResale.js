function extraCosts(item) {
  return (item.resale_item_costs ?? []).reduce((t, c) => t + (Number(c.amount) || 0), 0)
}

export function itemAllInCost(item) {
  return (Number(item.cost_price) || 0) + extraCosts(item)
}

export function itemProfit(item) {
  if (item.status !== 'sold') return null
  return (Number(item.sold_price) || 0) - itemAllInCost(item)
}

export function itemPotentialProfit(item) {
  if (item.status === 'sold' || item.target_price == null) return null
  return Number(item.target_price) - itemAllInCost(item)
}

// Lifetime totals, unaffected by any time-period filter. totalCost is every
// item's all-in cost regardless of status -- it doesn't drop an item just
// because it's since sold, so it reads as "money spent on stock overall".
export function deriveResaleSummary(items) {
  const sold = items.filter((i) => i.status === 'sold')
  const active = items.filter((i) => i.status !== 'sold')

  const totalCost = items.reduce((t, i) => t + itemAllInCost(i), 0)
  const totalSales = sold.reduce((t, i) => t + (Number(i.sold_price) || 0), 0)
  const totalProfit = sold.reduce((t, i) => t + itemProfit(i), 0)
  const potentialProfit = active
    .filter((i) => i.target_price != null)
    .reduce((t, i) => t + itemPotentialProfit(i), 0)

  const stageCounts = { purchased: 0, arrived: 0, listed: 0, sold: 0 }
  for (const item of items) stageCounts[item.status] = (stageCounts[item.status] ?? 0) + 1

  return { totalCost, totalSales, totalProfit, potentialProfit, stageCounts, itemCount: items.length }
}

// UTC throughout -- local-time date arithmetic drifts by a day once the
// increments cross a DST change (BST <-> GMT), and UTC has no DST.
function startOfWeek(dateString) {
  const d = new Date(dateString)
  const day = (d.getUTCDay() + 6) % 7 // Monday = 0
  d.setUTCDate(d.getUTCDate() - day)
  return d.toISOString().slice(0, 10)
}

function periodKey(dateString, granularity) {
  if (granularity === 'year') return dateString.slice(0, 4)
  if (granularity === 'month') return dateString.slice(0, 7)
  return startOfWeek(dateString)
}

function periodLabel(key, granularity) {
  if (granularity === 'year') return key
  if (granularity === 'month') return new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit' }).format(new Date(`${key}-01`))
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(key))
}

// Every period key from start to end (inclusive), so gaps with no sales show
// up as zero bars instead of vanishing -- keeps the timeline continuous.
function enumeratePeriods(startKey, endKey, granularity) {
  const keys = []

  if (granularity === 'year') {
    for (let y = Number(startKey); y <= Number(endKey); y++) keys.push(String(y))
    return keys
  }

  if (granularity === 'month') {
    let [y, m] = startKey.split('-').map(Number)
    const [endY, endM] = endKey.split('-').map(Number)
    while (y < endY || (y === endY && m <= endM)) {
      keys.push(`${y}-${String(m).padStart(2, '0')}`)
      m += 1
      if (m > 12) { m = 1; y += 1 }
    }
    return keys
  }

  let cursor = new Date(startKey)
  const end = new Date(endKey)
  while (cursor <= end) {
    keys.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }
  return keys
}

// A proper cash-flow timeline: a cost lands in the period an item was
// bought, a sale lands in the period it was sold -- the same item can
// contribute to two different bars if those periods differ. Unsold items
// still show up as a cost in their purchase period. Spans every period from
// the earliest activity through today, filling zero bars for gaps so the
// timeline reads continuously. Separate from deriveResaleSummary's lifetime
// totals, which stay item-matched rather than date-split.
export function deriveResaleTimeSeries(items, granularity) {
  if (items.length === 0) return []

  const totals = new Map()
  const addTo = (key, field, amount) => {
    const bucket = totals.get(key) ?? { totalCost: 0, totalSales: 0 }
    bucket[field] += amount
    totals.set(key, bucket)
  }

  for (const item of items) {
    if (item.purchased_date) addTo(periodKey(item.purchased_date, granularity), 'totalCost', itemAllInCost(item))
    if (item.status === 'sold' && item.sold_date) addTo(periodKey(item.sold_date, granularity), 'totalSales', Number(item.sold_price) || 0)
  }

  const activityDates = items.flatMap((i) => [i.purchased_date, i.sold_date]).filter(Boolean).sort()
  if (activityDates.length === 0) return []
  const startKey = periodKey(activityDates[0], granularity)
  const latestActivityKey = periodKey(activityDates[activityDates.length - 1], granularity)
  const todayKey = periodKey(new Date().toISOString().slice(0, 10), granularity)
  const endKey = todayKey > latestActivityKey ? todayKey : latestActivityKey

  // Gaps within the data get filled with zero bars so the timeline reads
  // continuously, but a trailing window keeps a rare huge gap (e.g. a
  // year-long break between sales) from stretching the chart into dozens
  // of empty periods -- caps are generous enough to rarely bite.
  const TRAILING_WINDOW = { week: 16, month: 12, year: 8 }
  let periods = enumeratePeriods(startKey, endKey, granularity)
  const cap = TRAILING_WINDOW[granularity]
  if (periods.length > cap) periods = periods.slice(-cap)

  return periods.map((key) => {
    const bucket = totals.get(key) ?? { totalCost: 0, totalSales: 0 }
    return {
      key,
      label: periodLabel(key, granularity),
      totalCost: bucket.totalCost,
      totalSales: bucket.totalSales,
      totalProfit: bucket.totalSales - bucket.totalCost,
    }
  })
}
