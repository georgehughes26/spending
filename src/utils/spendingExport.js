import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import { deriveSavingsGoals } from '../data/derive'
import { formatDDMMYYYY, formatMonthYear } from './format'

// Matches the category DataEntryPage syncs the fixed-costs total into on
// each monthly entry's spending.
const FIXED_COSTS_CATEGORY = 'Fixed Monthly Costs'

const sum = (values) => values.reduce((t, v) => t + (Number(v) || 0), 0)
const numberOrBlank = (value) => (value === undefined || value === null ? '' : Number(value) || 0)

async function fetchAll(table, userId, orderColumn) {
  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).order(orderColumn, { ascending: true })
  if (error) throw new Error(`Couldn't load ${table.replace(/_/g, ' ')}: ${error.message}`)
  return data ?? []
}

// Categories in the order you set them up, then anything still sitting in
// old data under a name that's since been renamed or deleted, so nothing
// recorded gets silently dropped from the export.
function categoryColumns(categories, rows, extraFirst = []) {
  const columns = [...categories.map((c) => c.name), ...extraFirst]
  for (const row of rows) {
    for (const key of Object.keys(row.spending ?? {})) {
      if (!columns.includes(key)) columns.push(key)
    }
  }
  return columns
}

// Plain widths sized to the longest value in each column, so the sheet is
// readable on open without dragging every column out by hand.
function sheetFromRows(rows, headers) {
  const sheet = XLSX.utils.json_to_sheet(rows, { header: headers })
  sheet['!cols'] = headers.map((h) => ({
    wch: Math.min(40, Math.max(h.length, ...rows.map((r) => String(r[h] ?? '').length)) + 2),
  }))
  return sheet
}

export async function exportSpendingToExcel(userId) {
  const [entries, weeks, fixedCosts, pots, categories] = await Promise.all([
    fetchAll('monthly_entries', userId, 'month'),
    fetchAll('weekly_spending', userId, 'week_start'),
    fetchAll('fixed_costs', userId, 'created_at'),
    fetchAll('savings_pots', userId, 'sort_order'),
    fetchAll('spending_categories', userId, 'sort_order'),
  ])

  // Contributions and closing balances are keyed by pot id -- a pot that's
  // since been deleted has no name left, so it gets a placeholder instead
  // of its figures disappearing.
  const potNames = new Map(pots.map((p) => [p.id, p.name]))
  for (const entry of entries) {
    for (const id of [...Object.keys(entry.goal_contributions ?? {}), ...Object.keys(entry.account_balances ?? {})]) {
      if (!potNames.has(id)) potNames.set(id, `Removed pot ${potNames.size - pots.length + 1}`)
    }
  }
  const hasHouseContributions = entries.some(
    (e) => Number(e.house_contribution_me) || Number(e.house_contribution_partner),
  )

  // Monthly: one row per month, figures exactly as entered (contributions
  // and balances are left blank where you didn't record one, rather than
  // filled with the dashboard's carried-forward estimates).
  const monthlyCategories = categoryColumns(categories, entries, [FIXED_COSTS_CATEGORY])
  const monthlyHeaders = [
    'Month', 'Period start', 'Period end', 'Income',
    ...monthlyCategories, 'Total spending', 'Left over',
    ...[...potNames.values()].flatMap((name) => [`${name} contribution`, `${name} balance`]),
    ...(hasHouseContributions ? ['House contribution (me)', 'House contribution (partner)'] : []),
    'Notes',
  ]
  const monthlyRows = entries.map((entry) => {
    const income = Number(entry.income) || 0
    const spent = sum(Object.values(entry.spending ?? {}))
    const row = {
      Month: formatMonthYear(entry.month),
      'Period start': formatDDMMYYYY(entry.period_start),
      'Period end': formatDDMMYYYY(entry.period_end),
      Income: income,
      'Total spending': spent,
      'Left over': income > 0 ? income - spent : '',
      Notes: entry.notes ?? '',
    }
    for (const cat of monthlyCategories) row[cat] = numberOrBlank(entry.spending?.[cat])
    for (const [id, name] of potNames) {
      row[`${name} contribution`] = numberOrBlank(entry.goal_contributions?.[id])
      row[`${name} balance`] = numberOrBlank(entry.account_balances?.[id])
    }
    if (hasHouseContributions) {
      row['House contribution (me)'] = Number(entry.house_contribution_me) || 0
      row['House contribution (partner)'] = Number(entry.house_contribution_partner) || 0
    }
    return row
  })

  // Weekly: every week you've logged, across all months.
  const weeklyCategories = categoryColumns(categories, weeks)
  const weeklyHeaders = ['Month', 'Week start', 'Week end', ...weeklyCategories, 'Total']
  const weeklyRows = weeks.map((week) => {
    const row = {
      Month: formatMonthYear(week.month),
      'Week start': formatDDMMYYYY(week.week_start),
      'Week end': formatDDMMYYYY(week.week_end),
      Total: sum(Object.values(week.spending ?? {})),
    }
    for (const cat of weeklyCategories) row[cat] = numberOrBlank(week.spending?.[cat])
    return row
  })

  // end_month is exclusive -- the cost stops applying from that month.
  // Costs added before fixed costs became month-scoped were backfilled with
  // a 2000-01-01 start, meaning "has always applied".
  const fixedHeaders = ['Cost', 'Amount', 'From', 'Stopped from']
  const fixedRows = fixedCosts.map((cost) => ({
    Cost: cost.name,
    Amount: Number(cost.amount) || 0,
    From: cost.start_month === '2000-01-01' ? 'Always' : formatMonthYear(cost.start_month),
    'Stopped from': cost.end_month ? formatMonthYear(cost.end_month) : '',
  }))

  const currentBalances = new Map(deriveSavingsGoals(entries, pots).map((g) => [g.id, g.current]))
  const potHeaders = ['Pot', 'Split %', 'Starting balance', 'Current balance', 'Target', 'Target date', 'Tracked by']
  const potRows = pots.map((pot) => ({
    Pot: pot.name,
    'Split %': Math.round((Number(pot.percentage) || 0) * 1000) / 10,
    'Starting balance': Number(pot.starting_balance) || 0,
    'Current balance': currentBalances.get(pot.id) ?? 0,
    Target: numberOrBlank(pot.target),
    'Target date': formatDDMMYYYY(pot.target_date),
    'Tracked by': pot.tracking_mode === 'balance' ? 'Closing balance' : 'Contributions',
  }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(monthlyRows, monthlyHeaders), 'Monthly')
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(weeklyRows, weeklyHeaders), 'Weekly Spending')
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(fixedRows, fixedHeaders), 'Fixed Costs')
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(potRows, potHeaders), 'Savings Pots')

  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `george-spending-${today}.xlsx`)
}
