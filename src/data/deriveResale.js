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

function startOfWeek(dateString) {
  const d = new Date(dateString)
  const day = (d.getDay() + 6) % 7 // Monday = 0
  d.setDate(d.getDate() - day)
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

// Buckets realized performance by sale date -- costs/sales/profit only
// become real once an item actually sells, so that's what's plotted here,
// not purchase date. Separate from deriveResaleSummary's lifetime totals.
export function deriveResaleTimeSeries(items, granularity) {
  const sold = items.filter((i) => i.status === 'sold' && i.sold_date)
  const buckets = new Map()

  for (const item of sold) {
    const key = periodKey(item.sold_date, granularity)
    const bucket = buckets.get(key) ?? { key, label: periodLabel(key, granularity), totalCost: 0, totalSales: 0, totalProfit: 0 }
    const cost = itemAllInCost(item)
    const sales = Number(item.sold_price) || 0
    bucket.totalCost += cost
    bucket.totalSales += sales
    bucket.totalProfit += sales - cost
    buckets.set(key, bucket)
  }

  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key))
}
