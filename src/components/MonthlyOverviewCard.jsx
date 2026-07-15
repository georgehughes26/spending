import Card from './Card'
import { formatGBP } from '../utils/format'

export default function MonthlyOverviewCard({ income, spent, saved }) {
  const savingRate = income > 0 ? Math.round((saved / income) * 100) : 0

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
          <span className="text-zinc-500">Saving rate</span>
          <span className="font-semibold text-zinc-900">{savingRate}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
            style={{ width: `${Math.min(100, savingRate)}%` }}
          />
        </div>
      </div>
    </Card>
  )
}
