import { useState } from 'react'
import { motion } from 'framer-motion'
import { tapScale } from '../motion'
import { validateWeekPlan, normalizeWeekPlanDays, diffWeekPlan } from '../../lib/habits/weekPlan'
import { formatShortDay } from '../../lib/habits/dates'

function formatLiftTargets(liftTargets) {
  if (!liftTargets || liftTargets.length === 0) return 'None'
  return liftTargets.map((t) => `${t.exercise} ${t.weight}kg`).join(', ')
}

function DiffRow({ row }) {
  const { date, current, incoming, changed, renamedTickedSessions } = row
  return (
    <div className="rounded-lg border border-zinc-200 p-3 text-xs dark:border-white/10">
      <div className="mb-1.5 font-medium text-zinc-700 dark:text-zinc-300">{formatShortDay(date)}</div>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-1">
        <span />
        <span className="text-zinc-400">Current</span>
        <span className="text-zinc-400">New</span>

        <span className="text-zinc-500">Sessions</span>
        <span className={changed.sessions ? 'text-zinc-400 line-through' : ''}>{current.sessions.join(', ') || 'Rest'}</span>
        <span className={changed.sessions ? 'font-medium text-pink-700 dark:text-emerald-400' : ''}>{incoming.sessions.join(', ') || 'Rest'}</span>

        <span className="text-zinc-500">Calories</span>
        <span className={changed.calories ? 'text-zinc-400 line-through' : ''}>{current.calories}</span>
        <span className={changed.calories ? 'font-medium text-pink-700 dark:text-emerald-400' : ''}>{incoming.calories}</span>

        <span className="text-zinc-500">Protein</span>
        <span className={changed.protein ? 'text-zinc-400 line-through' : ''}>{current.protein}</span>
        <span className={changed.protein ? 'font-medium text-pink-700 dark:text-emerald-400' : ''}>{incoming.protein}</span>

        <span className="text-zinc-500">Steps</span>
        <span className={changed.steps ? 'text-zinc-400 line-through' : ''}>{current.steps}</span>
        <span className={changed.steps ? 'font-medium text-pink-700 dark:text-emerald-400' : ''}>{incoming.steps}</span>

        <span className="text-zinc-500">Water</span>
        <span className={changed.water ? 'text-zinc-400 line-through' : ''}>{current.water}</span>
        <span className={changed.water ? 'font-medium text-pink-700 dark:text-emerald-400' : ''}>{incoming.water}</span>

        {changed.note && (
          <>
            <span className="text-zinc-500">Note</span>
            <span className="text-zinc-400 line-through">{current.note ?? '—'}</span>
            <span className="font-medium text-pink-700 dark:text-emerald-400">{incoming.note ?? '—'}</span>
          </>
        )}

        {changed.liftTargets && (
          <>
            <span className="text-zinc-500">Lift targets</span>
            <span className="text-zinc-400 line-through">{formatLiftTargets(current.liftTargets)}</span>
            <span className="font-medium text-pink-700 dark:text-emerald-400">{formatLiftTargets(incoming.liftTargets)}</span>
          </>
        )}
      </div>
      {renamedTickedSessions.length > 0 && (
        <p className="mt-1.5 text-amber-600 dark:text-amber-400">
          Existing tick kept for: {renamedTickedSessions.join(', ')} (now applies to the renamed session at the same spot)
        </p>
      )}
    </div>
  )
}

export default function WeekPlanImportModal({ weekPlans, template, dailyLogsByDate, onConfirm, onClose }) {
  const [raw, setRaw] = useState('')
  const [errors, setErrors] = useState([])
  const [preview, setPreview] = useState(null)
  const [plan, setPlan] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleValidate = () => {
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      setErrors(['Not valid JSON -- check for a missing comma or bracket'])
      setPreview(null)
      return
    }
    const foundErrors = validateWeekPlan(parsed)
    if (foundErrors.length > 0) {
      setErrors(foundErrors)
      setPreview(null)
      return
    }
    setErrors([])
    const normalized = normalizeWeekPlanDays(parsed)
    setPlan(parsed)
    setPreview(diffWeekPlan(normalized, weekPlans, template, dailyLogsByDate))
  }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await onConfirm(plan)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full flex-col gap-3 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-[var(--surface-dark)] sm:max-w-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-medium uppercase tracking-wide text-pink-700 dark:text-emerald-400">Import week plan</h2>

        {!preview && (
          <>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Paste the JSON week plan your coach sent you.</p>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder='{"type": "week_plan", ...}'
              rows={8}
              className="min-h-40 resize-none rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-800 outline-none focus:border-pink-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:focus:border-emerald-400"
            />
            {errors.length > 0 && (
              <ul className="list-disc space-y-0.5 rounded-lg bg-red-50 p-3 pl-7 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            <div className="flex gap-2">
              <motion.button {...tapScale} type="button" onClick={handleValidate} disabled={!raw.trim()} className="min-h-11 flex-1 cursor-pointer rounded-xl bg-pink-600 text-sm font-semibold text-white disabled:opacity-50 dark:bg-emerald-400 dark:text-zinc-950">
                Validate & preview
              </motion.button>
              <motion.button {...tapScale} type="button" onClick={onClose} className="min-h-11 cursor-pointer rounded-xl px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Cancel
              </motion.button>
            </div>
          </>
        )}

        {preview && (
          <>
            {plan.summary && <p className="rounded-lg bg-pink-50 p-3 text-sm text-pink-700 dark:bg-emerald-500/10 dark:text-emerald-400">{plan.summary}</p>}
            <div className="flex flex-col gap-2">
              {preview.map((row) => <DiffRow key={row.date} row={row} />)}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Logged data already entered on these days is never changed -- only targets, sessions and notes.</p>
            <div className="flex gap-2">
              <motion.button {...tapScale} type="button" onClick={handleConfirm} disabled={saving} className="min-h-11 flex-1 cursor-pointer rounded-xl bg-pink-600 text-sm font-semibold text-white disabled:opacity-50 dark:bg-emerald-400 dark:text-zinc-950">
                {saving ? 'Applying…' : 'Confirm'}
              </motion.button>
              <motion.button {...tapScale} type="button" onClick={() => setPreview(null)} className="min-h-11 cursor-pointer rounded-xl px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Back
              </motion.button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
