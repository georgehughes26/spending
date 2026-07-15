import Card from './Card'
import ProgressBar from './ProgressBar'

const ratingColor = {
  Excellent: 'text-emerald-400',
  Good: 'text-pink-400',
  Moderate: 'text-amber-400',
  Poor: 'text-red-400',
}

export default function HealthScoreCard({ health }) {
  const { score, breakdown, suggestions } = health

  return (
    <Card title="Financial Health Score">
      <div className="mb-4 flex items-center gap-4">
        <div className="text-4xl font-semibold text-zinc-50">{score}</div>
        <div className="text-sm text-zinc-500">/ 100</div>
      </div>

      <ul className="mb-4 flex flex-col gap-3">
        {breakdown.map((item) => (
          <li key={item.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-zinc-300">{item.label}</span>
              <span className={`font-medium ${ratingColor[item.rating] ?? 'text-zinc-300'}`}>
                {item.rating}
              </span>
            </div>
            <ProgressBar value={item.value} />
          </li>
        ))}
      </ul>

      {suggestions.length > 0 && (
        <div className="border-t border-zinc-800 pt-4">
          <h3 className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Suggestions</h3>
          <ul className="flex flex-col gap-2 text-sm text-zinc-300">
            {suggestions.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-pink-400" aria-hidden="true">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
