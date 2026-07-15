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

export function deriveMonthlyOverview(entries) {
  const latest = entries[entries.length - 1]
  if (!latest) return { income: 0, spent: 0, saved: 0, categories: [] }

  const income = Number(latest.income) || 0
  const spending = latest.spending ?? {}
  const spent = sum(spending)
  const categories = Object.entries(spending)
    .map(([name, amount]) => ({ name, amount: Number(amount) || 0 }))
    .sort((a, b) => b.amount - a.amount)

  return { income, spent, saved: income - spent, categories }
}

function monthlyLeftover(entry) {
  const income = Number(entry.income) || 0
  const spent = sum(entry.spending)
  return Math.max(0, income - spent)
}

// Each pot is guided by a fixed % of whatever's left over (income - spending)
// that month, but the actual amount transferred (entered at month-end) always
// wins once it's recorded — the % split is just a suggestion until then.
function potContributionForEntry(entry, pot) {
  const stored = entry.goal_contributions?.[pot.id]
  if (stored !== undefined && stored !== null) return Number(stored) || 0
  return monthlyLeftover(entry) * pot.percentage
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
    const latest = entries[entries.length - 1]
    const monthlyContribution = latest ? potContributionForEntry(latest, pot) : 0

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
    const totalContributed = entries.reduce((total, e) => total + potContributionForEntry(e, pot), 0)
    const latest = entries[entries.length - 1]
    const monthlyContribution = latest ? potContributionForEntry(latest, pot) : 0

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
