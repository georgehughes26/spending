import Card from './Card'
import { AnimatedNumber } from './motion'
import { formatGBP } from '../utils/format'

export default function ContributionsCard({ contributions }) {
  const total = contributions.reduce((t, c) => t + c.totalContributed, 0)

  return (
    <Card title="Contributions">
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        How much you've actually put into each pot. Separate from what it's worth now, since growth or loss
        moves the balance on its own.
      </p>
      <AnimatedNumber value={total} className="mb-4 block text-4xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-100" />
      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
        {contributions.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">
              {c.name} <span className="text-xs text-zinc-500 dark:text-zinc-400">({Math.round(c.percentage * 100)}%)</span>
            </span>
            <div className="text-right">
              <div className="font-medium text-zinc-900 dark:text-zinc-100">{formatGBP(c.totalContributed)}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{formatGBP(c.monthlyContribution)} this month</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
