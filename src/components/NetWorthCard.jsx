import Card from './Card'
import { formatGBP } from '../utils/format'

export default function NetWorthCard({ assets, liabilities, netWorthHistory }) {
  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0)
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.value, 0)
  const netWorth = totalAssets - totalLiabilities

  const current = netWorthHistory[netWorthHistory.length - 1]?.value ?? netWorth
  const previous = netWorthHistory[netWorthHistory.length - 2]?.value ?? current
  const monthlyChange = current - previous

  return (
    <Card title="Net Worth">
      <div className="mb-4 flex items-baseline justify-between">
        <span className="text-3xl font-semibold text-zinc-50">{formatGBP(netWorth)}</span>
        <span
          className={`text-sm font-medium ${monthlyChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {formatGBP(monthlyChange, { showSign: true })} this month
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="col-span-2 border-b border-zinc-800 pb-2 text-xs uppercase tracking-wide text-zinc-500">
          Assets — {formatGBP(totalAssets)}
        </div>
        {assets.map((a) => (
          <div key={a.label} className="flex items-center justify-between gap-2">
            <dt className="text-zinc-400">{a.label}</dt>
            <dd className="font-medium text-zinc-100">{formatGBP(a.value)}</dd>
          </div>
        ))}
        {totalLiabilities > 0 && (
          <>
            <div className="col-span-2 mt-2 border-b border-zinc-800 pb-2 text-xs uppercase tracking-wide text-zinc-500">
              Liabilities — {formatGBP(totalLiabilities)}
            </div>
            {liabilities.map((l) => (
              <div key={l.label} className="flex items-center justify-between gap-2">
                <dt className="text-zinc-400">{l.label}</dt>
                <dd className="font-medium text-red-300">{formatGBP(l.value)}</dd>
              </div>
            ))}
          </>
        )}
      </dl>
    </Card>
  )
}
