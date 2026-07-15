export default function ProgressBar({ value, className = '', barClassName = '' }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-zinc-800 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full bg-pink-600 transition-[width] duration-300 ${barClassName}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
