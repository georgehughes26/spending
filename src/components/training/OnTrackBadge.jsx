const STYLES = {
  'on-track': 'bg-pink-100 text-pink-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  ahead: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  behind: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
}

const LABELS = { 'on-track': 'On track', ahead: 'Ahead', behind: 'Behind' }

export default function OnTrackBadge({ track }) {
  if (!track) {
    return (
      <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-white/10 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Not enough data
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[track.status]}`}>
      {LABELS[track.status]}
    </span>
  )
}
