// "Sold" and "Completed" are both past the sale -- Completed just means the
// payout/shipping side is fully wrapped up too, so anywhere profit or sales
// totals are calculated, both statuses count the same.
const SOLD_STATUSES = new Set(['sold', 'completed'])
export function isSoldStatus(status) {
  return SOLD_STATUSES.has(status)
}

export function itemAllInCost(item) {
  return Number(item.cost_price) || 0
}

export function itemProfit(item) {
  if (!isSoldStatus(item.status)) return null
  return (Number(item.sold_price) || 0) - itemAllInCost(item)
}

export function itemPotentialProfit(item) {
  if (isSoldStatus(item.status) || item.target_price == null) return null
  return Number(item.target_price) - itemAllInCost(item)
}

// Lifetime totals, unaffected by any time-period filter. totalCost is every
// item's all-in cost regardless of status -- it doesn't drop an item just
// because it's since sold, so it reads as "money spent on stock overall" --
// plus general costs (packaging, subscriptions) that aren't tied to any one
// item. Those general costs reduce total profit but never touch a specific
// item's own profit/potential-profit figure, since they can't be attributed
// to one sale.
export function deriveResaleSummary(items, generalCosts = []) {
  const sold = items.filter((i) => isSoldStatus(i.status))
  const active = items.filter((i) => !isSoldStatus(i.status))

  const generalCostsTotal = generalCosts.reduce((t, c) => t + (Number(c.amount) || 0), 0)
  const totalCost = items.reduce((t, i) => t + itemAllInCost(i), 0) + generalCostsTotal
  const totalSales = sold.reduce((t, i) => t + (Number(i.sold_price) || 0), 0)
  const totalProfit = sold.reduce((t, i) => t + itemProfit(i), 0) - generalCostsTotal
  const potentialProfit = active
    .filter((i) => i.target_price != null)
    .reduce((t, i) => t + itemPotentialProfit(i), 0)

  const stageCounts = { purchased: 0, listed: 0, sold: 0, completed: 0 }
  for (const item of items) stageCounts[item.status] = (stageCounts[item.status] ?? 0) + 1

  return { totalCost, totalSales, totalProfit, potentialProfit, stageCounts, itemCount: items.length, generalCostsTotal }
}

// Item names are shirt listings like "Liverpool Home 23/24" or "Man Utd
// Away Shirt L" -- the team name is whatever word repeats across sold
// items once the kit-type words and size letters are stripped out. Numbers
// (season years, "23/24") are dropped too since they're never a team name.
const KIT_STOPWORDS = new Set(['home', 'away', 'third', 'fourth', 'kit', 'shirt', 'jersey'])
const SIZE_TOKENS = new Set(['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', '2xl', '3xl'])

function mostSoldTeam(sold) {
  const counts = new Map()
  for (const item of sold) {
    if (!item.name) continue
    const wordsInName = new Set()
    for (const word of item.name.split(/[^a-zA-Z]+/).filter(Boolean)) {
      const lower = word.toLowerCase()
      if (lower.length < 3 || KIT_STOPWORDS.has(lower) || SIZE_TOKENS.has(lower)) continue
      wordsInName.add(lower)
    }
    for (const lower of wordsInName) {
      const entry = counts.get(lower)
      if (entry) entry.count += 1
      else counts.set(lower, { count: 1, original: item.name.match(new RegExp(lower, 'i'))?.[0] ?? lower })
    }
  }

  let best = null
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry
  }
  // A count of 1 means nothing actually repeated -- not a "most sold team".
  return best && best.count > 1 ? best : null
}

// How profitable a typical sale is, which team's shirts move the most, and
// which courier carries most of the outgoing parcels.
export function deriveResaleLogistics(items) {
  const sold = items.filter((i) => isSoldStatus(i.status))

  const soldCost = sold.reduce((t, i) => t + itemAllInCost(i), 0)
  const soldProfit = sold.reduce((t, i) => t + itemProfit(i), 0)
  const avgProfitPerItem = sold.length > 0 ? soldProfit / sold.length : null
  const avgSalePrice = sold.length > 0 ? sold.reduce((t, i) => t + (Number(i.sold_price) || 0), 0) / sold.length : null
  const roiPercent = soldCost > 0 ? Math.round((soldProfit / soldCost) * 100) : null
  const totalItemsSold = sold.length

  const highestProfitItem = sold.reduce((best, item) => {
    const profit = itemProfit(item)
    return !best || profit > best.profit ? { name: item.name, profit } : best
  }, null)

  const topTeam = mostSoldTeam(sold)

  const courierCounts = {}
  for (const i of sold) {
    if (i.shipping_out) courierCounts[i.shipping_out] = (courierCounts[i.shipping_out] ?? 0) + 1
  }
  const courierSplit = Object.entries(courierCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return {
    avgProfitPerItem,
    avgSalePrice,
    roiPercent,
    totalItemsSold,
    highestProfitItem,
    topTeam,
    courierSplit,
  }
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
    if (isSoldStatus(item.status) && item.sold_date) addTo(periodKey(item.sold_date, granularity), 'totalSales', Number(item.sold_price) || 0)
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
  const TRAILING_WINDOW = { week: 4, month: 12, year: 8 }
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
