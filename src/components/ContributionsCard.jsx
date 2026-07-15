import Card from './Card'
import { formatGBP } from '../utils/format'

export default function ContributionsCard({ contributions }) {
  const total = contributions.reduce((t, c) => t + c.totalContributed, 0)

  return (
    <Card title="Contributions">
      <p className="mb-4 text-sm text-zinc-500">
        How much you've actually put into each pot. Separate from what it's worth now, since growth or loss
        moves the balance on its own.
      </p>
      <div className="mb-4 text-3xl font-semibold text-zinc-900">{formatGBP(total)}</div>
      <ul className="flex flex-col divide-y divide-zinc-200">
        {contributions.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-zinc-700">
              {c.name} <span className="text-xs text-zinc-500">({Math.round(c.percentage * 100)}%)</span>
            </span>
            <div className="text-right">
              <div className="font-medium text-zinc-900">{formatGBP(c.totalContributed)}</div>
              <div className="text-xs text-zinc-500">{formatGBP(c.monthlyContribution)} this month</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
