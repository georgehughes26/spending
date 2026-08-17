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

export function deriveResaleSummary(items) {
  const sold = items.filter((i) => i.status === 'sold')
  const active = items.filter((i) => i.status !== 'sold')

  const realizedProfit = sold.reduce((t, i) => t + itemProfit(i), 0)
  const investedInStock = active.reduce((t, i) => t + itemAllInCost(i), 0)
  const awaitingPayment = sold
    .filter((i) => i.payment_status === 'awaiting_payment')
    .reduce((t, i) => t + (Number(i.sold_price) || 0), 0)
  const potentialProfit = active
    .filter((i) => i.target_price != null)
    .reduce((t, i) => t + itemPotentialProfit(i), 0)

  const stageCounts = { purchased: 0, arrived: 0, listed: 0, sold: 0 }
  for (const item of items) stageCounts[item.status] = (stageCounts[item.status] ?? 0) + 1

  return { realizedProfit, investedInStock, awaitingPayment, potentialProfit, stageCounts, itemCount: items.length }
}
