function bandClass(score) {
  if (score >= 65) return 'text-emerald-600 dark:text-emerald-400'
  if (score < 40) return 'text-amber-600 dark:text-amber-400'
  return 'text-zinc-500 dark:text-zinc-400'
}

export default function RunningScoreBadge({ score }) {
  if (score === null || score === undefined) return null
  return (
    <span className="inline-flex items-baseline gap-0.5" aria-label={`Score ${score} out of 100`}>
      <span className={`text-sm font-semibold ${bandClass(score)}`}>{score}</span>
      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">/100</span>
    </span>
  )
}
