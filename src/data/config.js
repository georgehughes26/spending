// Static configuration for the tracker. Targets/dates live here since they
// change rarely; actual monthly figures come from Supabase (monthly_entries).

// Legacy fallback list — only used by the paused Bank Sync feature
// (src/pages/BankPage.jsx). The main app now uses per-user spending
// categories from the spending_categories table (see useSpendingCategories).
export const SPENDING_CATEGORIES = [
  'Food',
  'Drinking',
  'Shopping',
  'Entertainment',
  'Transport',
  'Health',
  'Other',
]

export const ACCOUNTS = [
  { key: 'LISA', label: 'LISA' },
  { key: 'Cash', label: 'Cash' },
  { key: 'Investments', label: 'Investments' },
  { key: 'Pension', label: 'Pension' },
]

// Balances before monthly tracking started — used as the baseline for the
// dashboard until the first monthly_entries row exists.
export const BASELINE_ACCOUNT_BALANCES = {
  LISA: 10500,
  Cash: 2000,
  Investments: 2700,
  Pension: 14800,
}

export const LIABILITIES = [
  { label: 'Car finance', value: 0 },
]

export const HOUSE_GOAL_CONFIG = {
  propertyTarget: 275000,
  depositTarget: 40000,
  expectedPurchaseDate: '2027-03-01',
  baselineMyContribution: 14000,
  baselinePartnerContribution: 25000,
}

export const GROWTH_ASSUMPTIONS = {
  monthlySavings: 700,
  investmentContribution: 250,
  pensionContribution: 300,
  investmentGrowthRate: 0.06,
  pensionGrowthRate: 0.05,
}

export const MILESTONES_CONFIG = [
  { id: 'm1', label: 'Reach £15,000 LISA', target: 15000, source: { type: 'goal', id: 'lisa' }, estimatedCompletion: '2027-01-01' },
  { id: 'm2', label: 'Reach £50,000 house deposit', target: 50000, source: { type: 'house' }, estimatedCompletion: '2027-09-01' },
  { id: 'm3', label: 'Reach £100,000 net worth', target: 100000, source: { type: 'netWorth' }, estimatedCompletion: '2030-05-01' },
  { id: 'm4', label: 'Reach £1,500 America', target: 1500, source: { type: 'goal', id: 'america' }, estimatedCompletion: '2027-03-01' },
]

export const FINANCIAL_HEALTH = {
  score: 85,
  breakdown: [
    { label: 'Emergency fund', rating: 'Good', value: 72 },
    { label: 'Savings rate', rating: 'Excellent', value: 95 },
    { label: 'Investments', rating: 'Good', value: 68 },
    { label: 'Debt', rating: 'Moderate', value: 55 },
  ],
  suggestions: [
    'Increase cash savings by £1,000 to improve your emergency fund score.',
    'Consider raising your investment contribution rate to reach the next tier.',
  ],
}

export function monthKey(date) {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
