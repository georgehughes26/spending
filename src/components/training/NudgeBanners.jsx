export default function NudgeBanners({ nudges }) {
  if (!nudges || nudges.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {nudges.map((n, i) => (
        <div
          key={i}
          className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
            n.kind === 'positive'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
          }`}
        >
          {n.text}
        </div>
      ))}
    </div>
  )
}
