import Card from './Card'
import { formatGBP } from '../utils/format'

function barColor(percentSpent) {
  if (percentSpent <= 50) return 'bg-emerald-500'
  if (percentSpent <= 75) return 'bg-amber-500'
  return 'bg-red-500'
}

function ArrowIcon({ up }) {
  return (
    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor" aria-hidden="true">
      {up ? <path d="M6 2l5 8H1z" /> : <path d="M6 10L1 2h10z" />}
    </svg>
  )
}

// Spending more than the same point last month is bad (red, up); spending
// less is good (green, down) -- mirrors the language the user asked for.
function ChangeBadge({ change }) {
  if (change == null || Math.round(Math.abs(change)) === 0) return null
  const up = change > 0
  const tone = up ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${tone}`}>
      <ArrowIcon up={up} />
      {formatGBP(Math.abs(change))}
    </span>
  )
}

export default function MonthlyOverviewCard({ income, spent, saved, categories = [], comparison = null }) {
  const percentSpent = income > 0 ? Math.round((spent / income) * 100) : 0
  const changeByCategory = Object.fromEntries((comparison?.categories ?? []).map((c) => [c.name, c.change]))

  const stats = [
    { label: 'Income', value: formatGBP(income), tone: 'text-zinc-900 dark:text-zinc-100' },
    { label: 'Spent', value: formatGBP(spent), tone: 'text-red-600 dark:text-red-400', change: comparison?.overallChange },
    { label: 'Saved', value: formatGBP(saved), tone: 'text-emerald-600 dark:text-emerald-400' },
  ]

  return (
    <Card title="Monthly Money Overview">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{s.label}</div>
            <div className={`mt-1 text-xl font-semibold ${s.tone}`}>{s.value}</div>
            {s.change !== undefined && (
              <div className="mt-0.5">
                <ChangeBadge change={s.change} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-zinc-200 dark:border-white/10 pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Spent this month</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{percentSpent}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${barColor(percentSpent)}`}
            style={{ width: `${Math.min(100, percentSpent)}%` }}
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mt-4 border-t border-zinc-200 dark:border-white/10 pt-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Spent by category</div>
          <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
            {categories.map((c) => (
              <li key={c.name} className="flex items-center justify-between py-2 text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">{c.name}</span>
                <span className="flex items-center gap-2">
                  <ChangeBadge change={changeByCategory[c.name]} />
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatGBP(c.amount)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
