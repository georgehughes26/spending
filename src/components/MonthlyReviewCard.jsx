import Card from './Card'
import { formatGBP } from '../utils/format'

export default function MonthlyReviewCard({ review, spendingByCategory }) {
  if (!review) {
    return (
      <Card title="Monthly Summary">
        <p className="text-sm text-zinc-500">
          No monthly data yet. Add an entry on the Data Entry page to see your summary here.
        </p>
      </Card>
    )
  }

  const { month, income, spent, saved, notes, netWorthChange } = review
  const categories = Object.entries(spendingByCategory ?? {}).filter(([, v]) => v > 0)

  return (
    <Card title={`${month} Summary`}>
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500">Income</div>
          <div className="mt-1 font-semibold text-zinc-50">{formatGBP(income)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500">Spent</div>
          <div className="mt-1 font-semibold text-red-300">{formatGBP(spent)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500">Saved</div>
          <div className="mt-1 font-semibold text-emerald-400">{formatGBP(saved)}</div>
        </div>
      </div>

      {categories.length > 0 && (
        <ul className="mb-4 flex flex-col gap-1.5 border-t border-zinc-800 pt-4 text-sm">
          {categories.map(([label, value]) => (
            <li key={label} className="flex items-center justify-between">
              <span className="text-zinc-400">{label}</span>
              <span className="font-medium text-zinc-200">{formatGBP(value)}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className="flex flex-col gap-3 border-t border-zinc-800 pt-4 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Net worth change</dt>
          <dd className={`mt-1 font-medium ${netWorthChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatGBP(netWorthChange, { showSign: true })}
          </dd>
        </div>
        {notes && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Notes</dt>
            <dd className="mt-1 text-zinc-200">{notes}</dd>
          </div>
        )}
      </dl>
    </Card>
  )
}
