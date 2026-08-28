const LABELS = { ahead: 'Ahead', on_track: 'On track', behind: 'Behind', inconclusive: 'Inconclusive' }
const COLORS = {
  ahead: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  on_track: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  behind: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  inconclusive: 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-400',
}

export default function RunningVerdictBadge({ verdict }) {
  if (!verdict) return null
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[verdict]}`}>{LABELS[verdict]}</span>
  )
}
