import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { tapScale } from '../motion'

// Not scored, just tracked -- a stepper rather than a number field since
// the actual number typed rarely matters, only nudging it up or down.
export function DrinksStepper({ value, onChange }) {
  const count = Number(value) || 0
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Drinks</div>
      <div className="flex items-center gap-3">
        <motion.button
          {...tapScale}
          type="button"
          onClick={() => onChange(Math.max(0, count - 1))}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-zinc-100 text-lg font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-200"
        >
          –
        </motion.button>
        <span className="w-6 text-center text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{count}</span>
        <motion.button
          {...tapScale}
          type="button"
          onClick={() => onChange(count + 1)}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-pink-100 text-lg font-semibold text-pink-700 dark:bg-emerald-500/15 dark:text-emerald-400"
        >
          +
        </motion.button>
      </div>
    </div>
  )
}

// Committed on blur, same as HabitNumberRow -- not scored, just a place to
// jot something (a run time, a reason for a miss, anything).
export function NoteField({ value, onCommit }) {
  const [draft, setDraft] = useState(value ?? '')
  useEffect(() => setDraft(value ?? ''), [value])

  return (
    <textarea
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== (value ?? '')) onCommit(draft || null) }}
      placeholder="Note for today (optional)"
      rows={2}
      className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 outline-none focus:border-pink-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:focus:border-emerald-400"
    />
  )
}
