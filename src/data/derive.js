import {
  ACCOUNTS,
  BASELINE_ACCOUNT_BALANCES,
  HOUSE_GOAL_CONFIG,
  LIABILITIES,
  MILESTONES_CONFIG,
} from './config'

const sum = (obj) => Object.values(obj ?? {}).reduce((total, v) => total + (Number(v) || 0), 0)

function formatMonthLabel(monthString) {
  return new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(monthString))
}

export function deriveNetWorthHistory(entries) {
  const totalLiabilities = LIABILITIES.reduce((t, l) => t + l.value, 0)

  if (entries.length === 0) {
    const total = sum(BASELINE_ACCOUNT_BALANCES) - totalLiabilities
    return [{ month: 'Today', value: total }]
  }

  return entries.map((entry) => {
    const balances = { ...BASELINE_ACCOUNT_BALANCES, ...(entry.account_balances ?? {}) }
    return { month: formatMonthLabel(entry.month), value: sum(balances) - totalLiabilities }
  })
}

export function deriveAssets(entries) {
  const latest = entries[entries.length - 1]
  const balances = latest?.account_balances && Object.keys(latest.account_balances).length > 0
    ? latest.account_balances
    : BASELINE_ACCOUNT_BALANCES

  return ACCOUNTS.map((a) => ({ label: a.label, value: balances[a.key] ?? 0 }))
}

// Income is only ever entered once, at month-end -- until then an entry
// sits at 0, so fall back to the previous entry's income as a working
// estimate rather than showing a misleading £0.
function effectiveIncome(entries, index) {
  return Number(entries[index]?.income) || Number(entries[index - 1]?.income) || 0
}

export function deriveMonthlyOverview(entries) {
  const index = entries.length - 1
  const latest = entries[index]
  if (!latest) return { income: 0, spent: 0, saved: 0, categories: [] }

  const income = effectiveIncome(entries, index)
  const spending = latest.spending ?? {}
  const spent = sum(spending)
  const categories = Object.entries(spending)
    .map(([name, amount]) => ({ name, amount: Number(amount) || 0 }))
    .sort((a, b) => b.amount - a.amount)

  return { income, spent, saved: income - spent, categories }
}

function aggregateSpending(weeks) {
  const totals = {}
  for (const week of weeks) {
    for (const [category, amount] of Object.entries(week.spending ?? {})) {
      totals[category] = (totals[category] ?? 0) + (Number(amount) || 0)
    }
  }
  return totals
}

// Compares this month's spending so far against last month's spending after
// the same number of weeks logged -- a fairer read than a full-month total,
// since the current month is usually still mid-way through. Weeks come in
// ascending week_start order already; only variable weekly spending is
// compared, not fixed costs, since those don't really "pace" week to week.
// Change is a £ amount: positive means spent more than the same point last
// month, negative means spent less.
export function deriveMonthlyComparison(currentWeeks, previousWeeks) {
  if (currentWeeks.length === 0 || previousWeeks.length === 0) return null

  const priorToPoint = previousWeeks.slice(0, currentWeeks.length)
  if (priorToPoint.length === 0) return null

  const currentTotals = aggregateSpending(currentWeeks)
  const priorTotals = aggregateSpending(priorToPoint)

  const overallChange = sum(currentTotals) - sum(priorTotals)

  const names = new Set([...Object.keys(currentTotals), ...Object.keys(priorTotals)])
  const categories = [...names].map((name) => ({
    name,
    change: (currentTotals[name] ?? 0) - (priorTotals[name] ?? 0),
  }))

  return { overallChange, categories }
}

function monthlyLeftover(entries, index) {
  const income = effectiveIncome(entries, index)
  const spent = sum(entries[index].spending)
  return Math.max(0, income - spent)
}

// Each pot is guided by a fixed % of whatever's left over (income - spending)
// that month, but the actual amount transferred (entered at month-end) always
// wins once it's recorded — the % split is just a suggestion until then.
function potContributionForEntry(entries, index, pot) {
  const stored = entries[index].goal_contributions?.[pot.id]
  if (stored !== undefined && stored !== null) return Number(stored) || 0
  return monthlyLeftover(entries, index) * pot.percentage
}

// A pot's value always comes from the closing balance you actually enter —
// never derived from contributions, since growth/loss/fees mean a pound in
// doesn't always mean a pound there. Falls back to the starting balance
// until the first closing balance is recorded.
function latestPotBalance(entries, pot) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const stored = entries[i].account_balances?.[pot.id]
    if (stored !== undefined && stored !== null) return Number(stored) || 0
  }
  return Number(pot.starting_balance) || 0
}

export function deriveSavingsGoals(entries, pots) {
  return (pots ?? []).map((pot) => {
    const latestIndex = entries.length - 1
    const monthlyContribution = latestIndex >= 0 ? potContributionForEntry(entries, latestIndex, pot) : 0

    return {
      id: pot.id,
      name: pot.name,
      percentage: pot.percentage,
      target: pot.target,
      targetDate: pot.target_date,
      current: latestPotBalance(entries, pot),
      monthlyContribution,
    }
  })
}

// Contributions are tracked separately from the pot's actual balance — this
// is "how much you've put in" (cash flow), not "what it's worth now".
export function deriveContributions(entries, pots) {
  return (pots ?? []).map((pot) => {
    const totalContributed = entries.reduce((total, e, i) => total + potContributionForEntry(entries, i, pot), 0)
    const latestIndex = entries.length - 1
    const monthlyContribution = latestIndex >= 0 ? potContributionForEntry(entries, latestIndex, pot) : 0

    return {
      id: pot.id,
      name: pot.name,
      percentage: pot.percentage,
      totalContributed,
      monthlyContribution,
    }
  })
}

// Total savings across all pots, as of each recorded month, using the same
// closing-balance-is-truth rule as deriveSavingsGoals (falls back to the
// starting balance until a pot's first closing balance is recorded).
export function deriveTotalSavingsHistory(entries, pots) {
  if (!pots || pots.length === 0) return []

  const running = Object.fromEntries(pots.map((pot) => [pot.id, Number(pot.starting_balance) || 0]))

  return entries.map((entry) => {
    for (const pot of pots) {
      const stored = entry.account_balances?.[pot.id]
      if (stored !== undefined && stored !== null) running[pot.id] = Number(stored) || 0
    }
    return {
      month: entry.month,
      total: pots.reduce((t, pot) => t + running[pot.id], 0),
    }
  })
}

export function deriveHouseGoal(entries) {
  const contributedMe = entries.reduce((t, e) => t + (Number(e.house_contribution_me) || 0), 0)
  const contributedPartner = entries.reduce((t, e) => t + (Number(e.house_contribution_partner) || 0), 0)

  const myContribution = HOUSE_GOAL_CONFIG.baselineMyContribution + contributedMe
  const partnerContribution = HOUSE_GOAL_CONFIG.baselinePartnerContribution + contributedPartner

  return {
    propertyTarget: HOUSE_GOAL_CONFIG.propertyTarget,
    depositTarget: HOUSE_GOAL_CONFIG.depositTarget,
    expectedPurchaseDate: HOUSE_GOAL_CONFIG.expectedPurchaseDate,
    currentDeposit: myContribution + partnerContribution,
    myContribution,
    partnerContribution,
  }
}

export function deriveMilestones(entries, pots) {
  const goals = deriveSavingsGoals(entries, pots)
  const house = deriveHouseGoal(entries)
  const netWorthHistory = deriveNetWorthHistory(entries)
  const netWorth = netWorthHistory[netWorthHistory.length - 1].value

  return MILESTONES_CONFIG.map((m) => {
    let current = 0
    if (m.source.type === 'goal') current = goals.find((g) => g.id === m.source.id)?.current ?? 0
    if (m.source.type === 'house') current = house.currentDeposit
    if (m.source.type === 'netWorth') current = netWorth

    return {
      id: m.id,
      label: m.label,
      current,
      target: m.target,
      estimatedCompletion: m.estimatedCompletion,
    }
  })
}

export function deriveMonthlyReview(entries) {
  const latest = entries[entries.length - 1]
  if (!latest) return null

  const previous = entries[entries.length - 2]
  const overview = deriveMonthlyOverview(entries)

  const netWorthHistory = deriveNetWorthHistory(entries)
  const netWorthChange = previous
    ? netWorthHistory[netWorthHistory.length - 1].value - netWorthHistory[netWorthHistory.length - 2].value
    : 0

  return {
    month: new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(new Date(latest.month)),
    income: overview.income,
    spent: overview.spent,
    saved: overview.saved,
    notes: latest.notes || '',
    netWorthChange,
  }
}
