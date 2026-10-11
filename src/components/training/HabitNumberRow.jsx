import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { tapScale } from '../motion'

const STATUS_BAR = {
  hit: 'bg-emerald-500',
  miss: 'bg-zinc-300 dark:bg-white/20',
  under: 'bg-amber-500',
  on: 'bg-emerald-500',
  over: 'bg-red-500',
}

const STATUS_TEXT = {
  hit: 'text-emerald-600 dark:text-emerald-400',
  miss: 'text-zinc-500 dark:text-zinc-400',
  under: 'text-amber-600 dark:text-amber-400',
  on: 'text-emerald-600 dark:text-emerald-400',
  over: 'text-red-600 dark:text-red-400',
}

// Committed on blur rather than every keystroke -- these write straight to
// Supabase, and a field someone's actively typing into shouldn't fire a
// network request per digit.
export default function HabitNumberRow({
  label, value, target, unit = '', decimals = 0, status, statusLabel,
  onCommit, quickAdd, streak, placeholder,
}) {
  const [draft, setDraft] = useState(value ?? '')
  useEffect(() => setDraft(value ?? ''), [value])

  const commit = (raw) => {
    const n = raw === '' ? null : Number(raw)
    if (n !== value) onCommit(n)
  }

  const pct = target > 0 && value != null ? Math.max(0, Math.min(1, value / target)) : 0

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</div>
          {target != null && (
            <div className={`text-xs ${STATUS_TEXT[status] ?? 'text-zinc-500 dark:text-zinc-400'}`}>
              {statusLabel ?? `target ${target.toLocaleString('en-GB')}${unit}`}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {streak > 1 && <span className="text-xs text-amber-600 dark:text-amber-400">🔥{streak}</span>}
          <div className="flex min-h-11 w-28 items-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 focus-within:border-pink-600 dark:focus-within:border-emerald-400">
            <input
              type="number"
              inputMode="decimal"
              step={decimals > 0 ? 10 ** -decimals : 1}
              value={draft}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={(e) => commit(e.target.value)}
              className="w-full rounded-lg bg-transparent px-2 py-2 text-right text-sm text-zinc-900 dark:text-zinc-100 outline-none"
            />
            {unit && <span className="pr-2 text-xs text-zinc-400">{unit}</span>}
          </div>
        </div>
      </div>

      {target != null && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
          <div className={`h-full rounded-full transition-[width] duration-300 ${STATUS_BAR[status] ?? 'bg-zinc-300'}`} style={{ width: `${pct * 100}%` }} />
        </div>
      )}

      {quickAdd && quickAdd.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {quickAdd.map((q, i) => {
            // A plain number adds itself in the row's own unit (e.g. protein's
            // +20g). An {amount, label} object adds `amount` in the row's unit
            // but displays `label` instead -- water's target/total stay in
            // litres (matching the coach's week-plan JSON contract) while its
            // buttons read in ml, since that's how a bottle size is known.
            const amount = typeof q === 'object' ? q.amount : q
            const label = typeof q === 'object' ? q.label : `+${amount}${unit}`
            return (
              <motion.button
                {...tapScale}
                key={i}
                type="button"
                onClick={() => onCommit((Number(value) || 0) + amount)}
                className="min-h-9 cursor-pointer rounded-full bg-pink-100 px-3 text-xs font-medium text-pink-700 dark:bg-emerald-500/15 dark:text-emerald-400"
              >
                {label}
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
