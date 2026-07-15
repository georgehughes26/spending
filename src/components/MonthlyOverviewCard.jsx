import Card from './Card'
import { formatGBP } from '../utils/format'

function barColor(percentSpent) {
  if (percentSpent <= 50) return 'bg-emerald-500'
  if (percentSpent <= 75) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function MonthlyOverviewCard({ income, spent, saved, categories = [] }) {
  const percentSpent = income > 0 ? Math.round((spent / income) * 100) : 0

  const stats = [
    { label: 'Income', value: formatGBP(income), tone: 'text-zinc-900' },
    { label: 'Spent', value: formatGBP(spent), tone: 'text-red-600' },
    { label: 'Saved', value: formatGBP(saved), tone: 'text-emerald-600' },
  ]

  return (
    <Card title="Monthly Money Overview">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-xs uppercase tracking-wide text-zinc-500">{s.label}</div>
            <div className={`mt-1 text-xl font-semibold ${s.tone}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-zinc-200 pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Spent this month</span>
          <span className="font-semibold text-zinc-900">{percentSpent}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${barColor(percentSpent)}`}
            style={{ width: `${Math.min(100, percentSpent)}%` }}
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mt-4 border-t border-zinc-200 pt-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Spent by category</div>
          <ul className="flex flex-col divide-y divide-zinc-200">
            {categories.map((c) => (
              <li key={c.name} className="flex items-center justify-between py-2 text-sm">
                <span className="text-zinc-700">{c.name}</span>
                <span className="font-medium text-zinc-900">{formatGBP(c.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
