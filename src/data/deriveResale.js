// A sale only counts once it's actually Completed, not just marked Sold --
// "Sold" means a price was agreed but the payout/shipping side isn't
// confirmed yet, so it stays out of profit/sales totals (and sold_date,
// which is really "completed date", isn't set yet either) until it's moved
// into Completed.
export function isRealizedSale(status) {
  return status === 'completed'
}

// Set aside for tax on every sale -- a flat 20% of the gross sale price for
// now, deliberately not profit-based (that comes later). Rounded to the
// penny since it's an amount you actually transfer.
export const TAX_POT_RATE = 0.2

export function taxPotAmount(salePrice) {
  return Math.round((Number(salePrice) || 0) * TAX_POT_RATE * 100) / 100
}

// The first £1,000 of sales each UK tax year (6 April to 5 April) is
// covered by the trading allowance, so the total pot owed is 20% of
// completed sales above that, worked out per tax year. (The per-sale
// "put £X in your tax pot" note is a flat 20%, which is right once a tax
// year's sales are past £1,000.)
export const TRADING_ALLOWANCE = 1000

function taxYearStart(dateString) {
  const year = Number(dateString.slice(0, 4))
  return dateString.slice(5, 10) >= '04-06' ? year : year - 1
}

export function taxPotDue(items) {
  const today = new Date().toISOString().slice(0, 10)
  const salesByTaxYear = new Map()
  for (const item of items) {
    if (!isRealizedSale(item.status)) continue
    const year = taxYearStart(item.sold_date || today)
    salesByTaxYear.set(year, (salesByTaxYear.get(year) ?? 0) + (Number(item.sold_price) || 0))
  }
  let total = 0
  for (const sales of salesByTaxYear.values()) total += Math.max(0, sales - TRADING_ALLOWANCE) * TAX_POT_RATE
  return Math.round(total * 100) / 100
}

// Business mileage is claimed at a flat 55p a mile. It's added to the
// Overheads figure in the profit totals, not listed as Overheads entries.
// Each trip is rounded to the penny, and totals are the sum of those, so
// the per-trip amounts on the page always add up to the total shown.
export const MILEAGE_RATE = 0.55

export function mileageCost(miles) {
  return Math.round((Number(miles) || 0) * MILEAGE_RATE * 100) / 100
}

export function mileageEntriesCost(entries) {
  return Math.round(entries.reduce((t, e) => t + mileageCost(e.miles), 0) * 100) / 100
}

export function itemAllInCost(item) {
  return Number(item.cost_price) || 0
}

export function itemProfit(item) {
  if (!isRealizedSale(item.status)) return null
  return (Number(item.sold_price) || 0) - itemAllInCost(item)
}

// Only Purchased/Listed stock is still "for sale" against a target price --
// once it's Sold (even pending Completion) it already has a real sold_price,
// so a leftover target_price shouldn't also count it as potential profit.
// Used per-card (ResaleCard's "est. £X" badge), not in the headline totals.
export function itemPotentialProfit(item) {
  if (item.status !== 'purchased' && item.status !== 'listed') return null
  if (item.target_price == null) return null
  return Number(item.target_price) - itemAllInCost(item)
}

// A Sold item already has a real agreed price -- not an estimate -- it's
// just waiting on the payout/shipping side before it counts as a done deal.
export function itemPendingProfit(item) {
  if (item.status !== 'sold') return null
  return (Number(item.sold_price) || 0) - itemAllInCost(item)
}

// Lifetime totals, unaffected by any time-period filter.
//   totalCost     = cost of every item bought (a shirt is a cost the moment
//                   it's bought, sold or not) + Direct Costs (namesets,
//                   mailing bags)
//   grossProfit   = totalSales (Completed only) - totalCost
//   totalExpenses = Overheads entries (subscriptions, ads) + mileage at 55p
//   netProfit     = grossProfit - totalExpenses
// pendingSales is what's still to come in: the agreed price of items marked
// Sold but not yet Completed. Their cost is already counted, so Gross
// Profit goes up by exactly this much once they complete.
export function deriveResaleSummary(items, generalCosts = [], generalExpenses = [], mileage = []) {
  const sold = items.filter((i) => isRealizedSale(i.status))

  const generalCostsTotal = generalCosts.reduce((t, c) => t + (Number(c.amount) || 0), 0)
  const overheadsTotal = generalExpenses.reduce((t, c) => t + (Number(c.amount) || 0), 0)
  const totalMiles = mileage.reduce((t, e) => t + (Number(e.miles) || 0), 0)
  const mileageTotal = mileageEntriesCost(mileage)
  const totalExpenses = overheadsTotal + mileageTotal
  const stockCost = items.reduce((t, i) => t + itemAllInCost(i), 0)
  const totalCost = stockCost + generalCostsTotal
  const totalSales = sold.reduce((t, i) => t + (Number(i.sold_price) || 0), 0)
  const grossProfit = totalSales - totalCost
  const netProfit = grossProfit - totalExpenses
  const pendingSales = items
    .filter((i) => i.status === 'sold')
    .reduce((t, i) => t + (Number(i.sold_price) || 0), 0)

  const stageCounts = { purchased: 0, listed: 0, sold: 0, completed: 0 }
  for (const item of items) stageCounts[item.status] = (stageCounts[item.status] ?? 0) + 1

  return {
    stockCost,
    generalCostsTotal,
    totalCost,
    totalSales,
    grossProfit,
    overheadsTotal,
    totalMiles,
    mileageTotal,
    totalExpenses,
    netProfit,
    pendingSales,
    stageCounts,
    itemCount: items.length,
  }
}

// Item names are shirt listings like "Liverpool Home 23/24" or "Man Utd
// Away Shirt L" -- the team name is whatever word repeats across sold
// items once the kit-type words and size letters are stripped out. Numbers
// (season years, "23/24") are dropped too since they're never a team name.
// Kit-type/size words and the brands that print on almost every shirt --
// without these, "Adidas" or "Nike" out-repeats any actual team name, same
// problem "size" had.
const KIT_STOPWORDS = new Set([
  'home', 'away', 'third', 'fourth', 'kit', 'shirt', 'jersey', 'size',
  'adidas', 'nike', 'puma', 'new', 'balance', 'castore', 'umbro', 'hummel',
  'diadora', 'macron', 'reebok',
])
const SIZE_TOKENS = new Set(['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', '2xl', '3xl'])

function significantWords(name) {
  const out = []
  for (const word of name.split(/[^a-zA-Z]+/).filter(Boolean)) {
    const lower = word.toLowerCase()
    if (lower.length < 3 || KIT_STOPWORDS.has(lower) || SIZE_TOKENS.has(lower)) continue
    out.push({ lower, original: word })
  }
  return out
}

function mostSoldTeam(sold) {
  const counts = new Map()
  const perItemWords = []
  for (const item of sold) {
    const words = item.name ? significantWords(item.name) : []
    perItemWords.push(words)
    const seen = new Set()
    for (const { lower, original } of words) {
      if (seen.has(lower)) continue
      seen.add(lower)
      const entry = counts.get(lower)
      if (entry) entry.count += 1
      else counts.set(lower, { count: 1, original })
    }
  }

  let best = null
  for (const [lower, entry] of counts) {
    if (!best || entry.count > best.count) best = { lower, ...entry }
  }
  // A count of 1 means nothing actually repeated -- not a "most sold team".
  if (!best || best.count <= 1) return null

  // Two-word club names ("Manchester United", "Aston Villa") lose to one of
  // their two words winning alone -- if the winning word is consistently
  // glued to the same neighbour, report the fuller phrase instead.
  const neighbourCounts = (direction) => {
    const out = new Map()
    for (const words of perItemWords) {
      const idx = words.findIndex((w) => w.lower === best.lower)
      if (idx === -1) continue
      const neighbour = direction === 'next' ? words[idx + 1] : words[idx - 1]
      if (!neighbour) continue
      const entry = out.get(neighbour.lower)
      if (entry) entry.count += 1
      else out.set(neighbour.lower, { count: 1, original: neighbour.original })
    }
    let top = null
    for (const [lower, entry] of out) {
      if (!top || entry.count > top.count) top = { lower, ...entry }
    }
    return top
  }

  const DOMINANCE = 0.6
  const nextTop = neighbourCounts('next')
  const prevTop = neighbourCounts('prev')
  if (nextTop && nextTop.count / best.count >= DOMINANCE && (!prevTop || nextTop.count >= prevTop.count)) {
    return { count: nextTop.count, original: `${best.original} ${nextTop.original}` }
  }
  if (prevTop && prevTop.count / best.count >= DOMINANCE) {
    return { count: prevTop.count, original: `${prevTop.original} ${best.original}` }
  }

  return { count: best.count, original: best.original }
}

// How profitable a typical sale is, which team's shirts move the most, and
// which courier carries most of the outgoing parcels. Average profit is
// Gross Profit (all stock bought + Direct Costs taken off) per item sold,
// matching the Gross Profit figure at the top of the page.
export function deriveResaleLogistics(items, generalCosts = []) {
  const sold = items.filter((i) => isRealizedSale(i.status))

  const salesTotal = sold.reduce((t, i) => t + (Number(i.sold_price) || 0), 0)
  const stockCost = items.reduce((t, i) => t + itemAllInCost(i), 0)
  const directCostsTotal = generalCosts.reduce((t, c) => t + (Number(c.amount) || 0), 0)
  const avgProfitPerItem = sold.length > 0 ? (salesTotal - stockCost - directCostsTotal) / sold.length : null
  const avgSalePrice = sold.length > 0 ? sold.reduce((t, i) => t + (Number(i.sold_price) || 0), 0) / sold.length : null
  const totalItemsSold = sold.length

  const currentMonthKey = new Date().toISOString().slice(0, 7)
  const soldThisMonth = sold.filter((i) => i.sold_date?.slice(0, 7) === currentMonthKey).length

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
    soldThisMonth,
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

// Gross profit over time, same rules as the headline totals: a shirt's
// cost lands in the period it was bought (purchased_date), its sale in the
// period it was Completed (a sale still pending completion doesn't show up
// yet), and Direct Costs in the period they were incurred (cost_date) --
// so summing every bar's grossProfit matches the lifetime Gross Profit
// figure, as long as all the activity falls inside the trailing window
// below. Overheads and mileage aren't charted, only counted in Net Profit.
// Spans every period from the earliest activity through today, filling
// zero bars for gaps so the timeline reads continuously.
export function deriveResaleTimeSeries(items, generalCosts, granularity) {
  const completed = items.filter((i) => isRealizedSale(i.status) && i.sold_date)
  const bought = items.filter((i) => i.purchased_date)
  const dateCosts = generalCosts.filter((c) => c.cost_date)
  if (completed.length === 0 && bought.length === 0 && dateCosts.length === 0) return []

  const emptyBucket = () => ({ totalCost: 0, totalSales: 0 })
  const totals = new Map()
  const addTo = (key, field, amount) => {
    const bucket = totals.get(key) ?? emptyBucket()
    bucket[field] += amount
    totals.set(key, bucket)
  }

  for (const item of bought) {
    addTo(periodKey(item.purchased_date, granularity), 'totalCost', itemAllInCost(item))
  }
  for (const item of completed) {
    addTo(periodKey(item.sold_date, granularity), 'totalSales', Number(item.sold_price) || 0)
  }
  for (const cost of dateCosts) {
    addTo(periodKey(cost.cost_date, granularity), 'totalCost', Number(cost.amount) || 0)
  }

  const activityDates = [
    ...bought.map((i) => i.purchased_date),
    ...completed.map((i) => i.sold_date),
    ...dateCosts.map((c) => c.cost_date),
  ].sort()
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
    const bucket = totals.get(key) ?? emptyBucket()
    return {
      key,
      label: periodLabel(key, granularity),
      totalCost: bucket.totalCost,
      totalSales: bucket.totalSales,
      grossProfit: bucket.totalSales - bucket.totalCost,
    }
  })
}
