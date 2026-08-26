import Card from './Card'
import { AnimatedNumber } from './motion'
import { formatGBP } from '../utils/format'

// The one headline moment on the dashboard -- a solid-color hero rather than
// another white card, so the single most important number actually reads as
// the most important number.
export default function NetWorthCard({ assets, liabilities, netWorthHistory }) {
  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0)
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.value, 0)

  // netWorthHistory is the single source of truth (it's what
  // deriveTotalSavingsHistory/deriveSavingsGoals agree with) -- the headline
  // figure must come from there, not a second assets-liabilities calc that
  // can silently drift from it.
  const current = netWorthHistory[netWorthHistory.length - 1]?.value ?? (totalAssets - totalLiabilities)
  const previous = netWorthHistory[netWorthHistory.length - 2]?.value ?? current
  const monthlyChange = current - previous

  return (
    <Card
      title="Net Worth"
      className="!border-0 bg-gradient-to-br from-pink-600 to-rose-600 dark:from-emerald-500 dark:to-teal-600 !shadow-[0_16px_40px_-12px_rgba(219,39,119,0.45)] dark:!shadow-[0_16px_40px_-12px_rgba(16,185,129,0.35)]"
      titleClassName="!text-pink-100 dark:!text-emerald-50"
    >
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <AnimatedNumber value={current} className="block text-5xl font-bold tracking-tight tabular-nums text-white sm:text-6xl" />
        <span className={`text-sm font-semibold ${monthlyChange >= 0 ? 'text-emerald-100' : 'text-rose-100'}`}>
          {formatGBP(monthlyChange, { showSign: true })} this month
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="col-span-2 border-b border-white/25 pb-2 text-xs font-medium uppercase tracking-wide text-white/80">
          Assets — {formatGBP(totalAssets)}
        </div>
        {assets.map((a) => (
          <div key={a.label} className="flex items-center justify-between gap-2">
            <dt className="text-white/80">{a.label}</dt>
            <dd className="font-medium text-white">{formatGBP(a.value)}</dd>
          </div>
        ))}
        {totalLiabilities > 0 && (
          <>
            <div className="col-span-2 mt-2 border-b border-white/25 pb-2 text-xs font-medium uppercase tracking-wide text-white/80">
              Liabilities — {formatGBP(totalLiabilities)}
            </div>
            {liabilities.map((l) => (
              <div key={l.label} className="flex items-center justify-between gap-2">
                <dt className="text-white/80">{l.label}</dt>
                <dd className="font-medium text-rose-100">{formatGBP(l.value)}</dd>
              </div>
            ))}
          </>
        )}
      </dl>
    </Card>
  )
}
