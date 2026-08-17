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

// Lifetime totals, unaffected by any time-period filter.
export function deriveResaleSummary(items) {
  const sold = items.filter((i) => i.status === 'sold')
  const active = items.filter((i) => i.status !== 'sold')

  const costInStock = active.reduce((t, i) => t + itemAllInCost(i), 0)
  const totalSales = sold.reduce((t, i) => t + (Number(i.sold_price) || 0), 0)
  const totalProfit = sold.reduce((t, i) => t + itemProfit(i), 0)
  const potentialProfit = active
    .filter((i) => i.target_price != null)
    .reduce((t, i) => t + itemPotentialProfit(i), 0)
  const awaitingPayment = sold
    .filter((i) => i.payment_status === 'awaiting_payment')
    .reduce((t, i) => t + (Number(i.sold_price) || 0), 0)

  const stageCounts = { purchased: 0, arrived: 0, listed: 0, sold: 0 }
  for (const item of items) stageCounts[item.status] = (stageCounts[item.status] ?? 0) + 1

  return { costInStock, totalSales, totalProfit, potentialProfit, awaitingPayment, stageCounts, itemCount: items.length }
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

// Buckets realized performance by sale date -- costs/sales/profit only
// become real once an item actually sells, so that's what's plotted here,
// not purchase date. Separate from deriveResaleSummary's lifetime totals.
// Spans every period from the first sale through today, filling in zero
// bars for periods with no sales so the timeline reads continuously.
export function deriveResaleTimeSeries(items, granularity) {
  const sold = items.filter((i) => i.status === 'sold' && i.sold_date)
  if (sold.length === 0) return []

  const totals = new Map()
  for (const item of sold) {
    const key = periodKey(item.sold_date, granularity)
    const bucket = totals.get(key) ?? { totalCost: 0, totalSales: 0, totalProfit: 0 }
    const cost = itemAllInCost(item)
    const sales = Number(item.sold_price) || 0
    bucket.totalCost += cost
    bucket.totalSales += sales
    bucket.totalProfit += sales - cost
    totals.set(key, bucket)
  }

  const soldDates = sold.map((i) => i.sold_date).sort()
  const startKey = periodKey(soldDates[0], granularity)
  const latestSoldKey = periodKey(soldDates[soldDates.length - 1], granularity)
  const todayKey = periodKey(new Date().toISOString().slice(0, 10), granularity)
  const endKey = todayKey > latestSoldKey ? todayKey : latestSoldKey

  // Gaps within the data get filled with zero bars so the timeline reads
  // continuously, but a trailing window keeps a rare huge gap (e.g. a
  // year-long break between sales) from stretching the chart into dozens
  // of empty periods -- caps are generous enough to rarely bite.
  const TRAILING_WINDOW = { week: 16, month: 12, year: 8 }
  let periods = enumeratePeriods(startKey, endKey, granularity)
  const cap = TRAILING_WINDOW[granularity]
  if (periods.length > cap) periods = periods.slice(-cap)

  return periods.map((key) => ({
    key,
    label: periodLabel(key, granularity),
    totalCost: 0,
    totalSales: 0,
    totalProfit: 0,
    ...totals.get(key),
  }))
}
