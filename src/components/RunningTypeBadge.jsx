import { runTypeLabel } from '../lib/running/format'

const COLORS = {
  easy: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  interval: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  tempo: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  time_trial: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
}

export default function RunningTypeBadge({ runType }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[runType] ?? COLORS.easy}`}>
      {runTypeLabel(runType)}
    </span>
  )
}
