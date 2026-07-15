import { useEffect, useState } from 'react'
import NumberField from './NumberField'
import { formatGBP } from '../utils/format'
import { formatWeekRange } from '../utils/weeks'

function emptySpending(categories) {
  return Object.fromEntries(categories.map((c) => [c, 0]))
}

export default function WeekEntryRow({ weekStart, weekEnd, categories, initialSpending, onSave }) {
  const [expanded, setExpanded] = useState(false)
  const [spending, setSpending] = useState({ ...emptySpending(categories), ...initialSpending })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setSpending({ ...emptySpending(categories), ...initialSpending })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSpending, categories])

  const total = Object.values(spending).reduce((t, v) => t + (Number(v) || 0), 0)
  const hasData = Object.values(initialSpending ?? {}).some((v) => Number(v) > 0)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(weekStart, weekEnd, spending)
      setExpanded(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="py-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between text-left text-sm"
      >
        <span className="flex items-center gap-2 text-zinc-800">
          {formatWeekRange(weekStart, weekEnd)}
          {hasData && <span className="h-1.5 w-1.5 rounded-full bg-pink-500" aria-hidden="true" />}
        </span>
        <span className="flex items-center gap-3">
          <span className="font-medium text-zinc-900">{formatGBP(total)}</span>
          <span className="text-xs text-zinc-500">{expanded ? 'Hide' : hasData ? 'Edit' : 'Add'}</span>
        </span>
      </button>

      {expanded && (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-pink-50 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {categories.map((category) => (
              <NumberField
                key={category}
                id={`week-${weekStart}-${category}`}
                label={category}
                value={spending[category] ?? 0}
                onChange={(v) => setSpending((prev) => ({ ...prev, [category]: v }))}
              />
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-4 min-h-11 cursor-pointer rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save week'}
          </button>
        </div>
      )}
    </li>
  )
}
