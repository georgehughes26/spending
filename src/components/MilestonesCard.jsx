import Card from './Card'
import ProgressBar from './ProgressBar'
import { formatGBP, formatMonthYear } from '../utils/format'

function findNextMilestone(milestones) {
  return [...milestones]
    .filter((m) => m.current < m.target)
    .sort((a, b) => (a.target - a.current) / a.target - (b.target - b.current) / b.target)[0]
}

export default function MilestonesCard({ milestones }) {
  const next = findNextMilestone(milestones)

  return (
    <Card title="Milestones">
      {next && (
        <div className="mb-5 rounded-xl border border-pink-900/40 bg-pink-950/20 p-4">
          <div className="mb-1 text-xs uppercase tracking-wide text-pink-400">Next milestone</div>
          <div className="mb-2 font-medium text-zinc-50">{next.label}</div>
          <ProgressBar value={(next.current / next.target) * 100} className="mb-2" />
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-zinc-400">
            <span>Current: {formatGBP(next.current)}</span>
            <span>Remaining: {formatGBP(next.target - next.current)}</span>
            <span>Est: {formatMonthYear(next.estimatedCompletion)}</span>
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-4">
        {milestones.map((m) => {
          const progress = (m.current / m.target) * 100
          const complete = m.current >= m.target
          return (
            <li key={m.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className={complete ? 'text-emerald-400' : 'text-zinc-200'}>{m.label}</span>
                <span className="text-zinc-500">{Math.min(100, progress).toFixed(0)}%</span>
              </div>
              <ProgressBar
                value={progress}
                barClassName={complete ? 'bg-emerald-500' : undefined}
              />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
