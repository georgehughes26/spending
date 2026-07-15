import Card from './Card'
import ProgressBar from './ProgressBar'
import { formatGBP, formatMonthYear } from '../utils/format'

function estimateCompletion(goal) {
  const remaining = goal.target - goal.current
  if (remaining <= 0) return 'Complete'
  if (goal.monthlyContribution <= 0) return 'Not on track'
  const monthsNeeded = Math.ceil(remaining / goal.monthlyContribution)
  const today = new Date()
  const eta = new Date(today.getFullYear(), today.getMonth() + monthsNeeded, 1)
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(eta)
}

export default function SavingsGoalsCard({ goals }) {
  return (
    <Card title="Savings Goal Tracker">
      <ul className="flex flex-col gap-5">
        {goals.map((goal) => {
          const hasTarget = goal.target != null
          const progress = hasTarget ? (goal.current / goal.target) * 100 : 0

          return (
            <li key={goal.id}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="font-medium text-zinc-100">
                  {goal.name} <span className="text-xs font-normal text-zinc-500">({Math.round(goal.percentage * 100)}%)</span>
                </span>
                <span className="text-sm text-zinc-400">
                  {hasTarget ? `${formatGBP(goal.current)} / ${formatGBP(goal.target)}` : formatGBP(goal.current)}
                </span>
              </div>
              {hasTarget && <ProgressBar value={progress} className="mb-2" />}
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-zinc-500">
                {hasTarget ? (
                  <>
                    <span>{goal.targetDate ? `Target: ${formatMonthYear(goal.targetDate)}` : 'No deadline'}</span>
                    <span>{formatGBP(goal.monthlyContribution)}/mo</span>
                    <span>Est. completion: {estimateCompletion(goal)}</span>
                  </>
                ) : (
                  <>
                    <span>No target set</span>
                    <span>{formatGBP(goal.monthlyContribution)}/mo</span>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
