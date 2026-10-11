export default function ProgressRing({ done, total, size = 48 }) {
  const pct = total > 0 ? done / total : 0
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth="4" className="stroke-zinc-200 dark:stroke-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className="stroke-pink-600 dark:stroke-emerald-400 transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
        {done}/{total}
      </div>
    </div>
  )
}
