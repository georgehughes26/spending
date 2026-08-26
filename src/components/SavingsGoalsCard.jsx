import Card from './Card'
import { formatGBP, formatMonthYear } from '../utils/format'

// Always green regardless of theme, with the amount added last month picked
// out in yellow -- unlike the shared ProgressBar, this one isn't meant to
// reflect the pink/emerald theme toggle.
function GoalProgressBar({ basePercent, addedPercent, className = '' }) {
  return (
    <div
      className={`flex h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(basePercent + addedPercent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${basePercent}%` }} />
      <div className="h-full bg-yellow-400 transition-[width] duration-300" style={{ width: `${addedPercent}%` }} />
    </div>
  )
}

function estimateCompletion(goal) {
  const remaining = goal.target - goal.current
  if (remaining <= 0) return 'Complete'
  if (goal.monthlyContribution <= 0) return 'Not on track'
  const monthsNeeded = Math.ceil(remaining / goal.monthlyContribution)
  const today = new Date()
  const eta = new Date(today.getFullYear(), today.getMonth() + monthsNeeded, 1)
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(eta)
}

// Goals with a target come first (largest target first), then the rest
// ordered by current balance (largest first).
function sortGoals(goals) {
  return [...goals].sort((a, b) => {
    const aHasTarget = a.target != null
    const bHasTarget = b.target != null
    if (aHasTarget && bHasTarget) return b.target - a.target
    if (aHasTarget !== bHasTarget) return aHasTarget ? -1 : 1
    return b.current - a.current
  })
}

export default function SavingsGoalsCard({ goals }) {
  const sortedGoals = sortGoals(goals)

  return (
    <Card title="Savings Goal Tracker">
      <ul className="flex flex-col gap-5">
        {sortedGoals.map((goal) => {
          const hasTarget = goal.target != null
          const totalPercent = hasTarget ? Math.max(0, Math.min(100, (goal.current / goal.target) * 100)) : 0
          const previousAmount = Math.max(0, goal.current - Math.max(0, goal.monthlyContribution || 0))
          const basePercent = hasTarget ? Math.max(0, Math.min(100, (previousAmount / goal.target) * 100)) : 0
          const addedPercent = Math.max(0, totalPercent - basePercent)

          return (
            <li key={goal.id}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {goal.name} <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">({Math.round(goal.percentage * 100)}%)</span>
                </span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {hasTarget ? `${formatGBP(goal.current)} / ${formatGBP(goal.target)}` : formatGBP(goal.current)}
                </span>
              </div>
              {hasTarget && <GoalProgressBar basePercent={basePercent} addedPercent={addedPercent} className="mb-2" />}
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
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
