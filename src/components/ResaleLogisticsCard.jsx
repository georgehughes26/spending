import Card from './Card'
import { AnimatedNumber } from './motion'

function CourierBar({ courier, total }) {
  const pct = total > 0 ? Math.round((courier.count / total) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>{courier.name}</span>
        <span>{courier.count} ({pct}%)</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
        <div className="h-full rounded-full bg-pink-500 dark:bg-emerald-400 transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function ResaleLogisticsCard({ logistics }) {
  const { awaitingShipment, avgDaysToSell, sellThroughRate, courierSplit } = logistics
  const courierTotal = courierSplit.reduce((t, c) => t + c.count, 0)

  return (
    <Card title="Logistics">
      <div
        className={`mb-4 flex items-center justify-between rounded-xl border p-4 ${
          awaitingShipment > 0
            ? 'border-pink-300 bg-pink-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
            : 'border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/5'
        }`}
      >
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Awaiting shipment</span>
        <AnimatedNumber
          value={awaitingShipment}
          format="plain"
          className={`text-2xl font-bold tabular-nums ${
            awaitingShipment > 0 ? 'text-pink-700 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'
          }`}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Sell-through rate</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{sellThroughRate}%</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Avg. days to sell</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {avgDaysToSell != null ? avgDaysToSell : '—'}
          </div>
        </div>
      </div>

      {courierSplit.length > 0 && (
        <div className="border-t border-zinc-200 dark:border-white/10 pt-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Shipping out by courier</div>
          <div className="flex flex-col gap-3">
            {courierSplit.map((c) => (
              <CourierBar key={c.name} courier={c} total={courierTotal} />
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
