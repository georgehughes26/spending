import Card from './Card'
import { formatGBP } from '../utils/format'

export default function TotalSavingsCard({ goals }) {
  const total = goals.reduce((t, g) => t + g.current, 0)

  return (
    <Card title="Total Savings">
      <div className="mb-4 text-3xl font-semibold text-zinc-900">{formatGBP(total)}</div>
      <ul className="flex flex-col divide-y divide-zinc-200">
        {goals.map((goal) => {
          const share = total > 0 ? Math.round((goal.current / total) * 100) : 0
          return (
            <li key={goal.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-zinc-700">
                {goal.name} <span className="text-xs text-zinc-500">({share}%)</span>
              </span>
              <span className="font-medium text-zinc-900">{formatGBP(goal.current)}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
