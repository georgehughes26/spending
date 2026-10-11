import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useTrainingData } from '../hooks/useTrainingData'
import { FadeInItem, FadeInStagger, tapScale } from '../components/motion'
import Card from '../components/Card'
import { exportAllTrainingData, importAllTrainingData } from '../lib/habits/db'
import TrainingSubNav from '../components/training/TrainingSubNav'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-zinc-500 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  )
}

const inputClass = 'min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400'

function GoalSettingsCard({ settings, onSave }) {
  const [form, setForm] = useState(settings)
  const [saving, setSaving] = useState(false)
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const save = async () => {
    setSaving(true)
    try {
      await onSave({
        plan_start: form.plan_start,
        goal_date: form.goal_date,
        start_weight: Number(form.start_weight) || 0,
        goal_weight: Number(form.goal_weight) || 0,
        calorie_tolerance: Number(form.calorie_tolerance) || 0,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="Goal & plan">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Plan start"><input type="date" value={form.plan_start} onChange={set('plan_start')} className={inputClass} /></Field>
        <Field label="Goal date"><input type="date" value={form.goal_date} onChange={set('goal_date')} className={inputClass} /></Field>
        <Field label="Starting weight (kg)"><input type="number" step="0.1" value={form.start_weight} onChange={set('start_weight')} className={inputClass} /></Field>
        <Field label="Goal weight (kg)"><input type="number" step="0.1" value={form.goal_weight} onChange={set('goal_weight')} className={inputClass} /></Field>
        <Field label="Calorie tolerance (±)"><input type="number" step="10" value={form.calorie_tolerance} onChange={set('calorie_tolerance')} className={inputClass} /></Field>
      </div>
      <motion.button {...tapScale} type="button" onClick={save} disabled={saving} className="mt-4 min-h-11 w-full cursor-pointer rounded-xl bg-pink-600 text-sm font-semibold text-white disabled:opacity-50 dark:bg-emerald-400 dark:text-zinc-950">
        {saving ? 'Saving…' : 'Save'}
      </motion.button>
    </Card>
  )
}

function TemplateDayRow({ row, onSave }) {
  const [form, setForm] = useState({ ...row, sessionsText: row.sessions.join(', ') })
  const [saving, setSaving] = useState(false)

  const commit = async (fields) => {
    const next = { ...form, ...fields }
    setForm(next)
    setSaving(true)
    try {
      await onSave(row.weekday, {
        sessions: next.sessionsText.split(',').map((s) => s.trim()).filter(Boolean),
        calories: Number(next.calories) || 0,
        protein: Number(next.protein) || 0,
        steps: Number(next.steps) || 0,
        water: Number(next.water) || 0,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-3 dark:border-white/10">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{WEEKDAY_LABELS[row.weekday]}</span>
        {saving && <span className="text-xs text-zinc-400">Saving…</span>}
      </div>
      <Field label="Sessions (comma separated, blank = rest)">
        <input
          type="text"
          value={form.sessionsText}
          onChange={(e) => setForm((f) => ({ ...f, sessionsText: e.target.value }))}
          onBlur={() => commit({})}
          className={inputClass}
        />
      </Field>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {['calories', 'protein', 'steps', 'water'].map((field) => (
          <Field key={field} label={field[0].toUpperCase() + field.slice(1)}>
            <input
              type="number"
              value={form[field]}
              onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
              onBlur={() => commit({})}
              className={inputClass}
            />
          </Field>
        ))}
      </div>
    </div>
  )
}

function CustomHabitsCard({ customHabits, onAdd, onDelete }) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState('tick')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('')
  const [adding, setAdding] = useState(false)

  const add = async (e) => {
    e.preventDefault()
    if (!label.trim()) return
    setAdding(true)
    try {
      await onAdd({ label, type, target: type === 'number' && target !== '' ? Number(target) : null, unit: unit || null })
      setLabel(''); setTarget(''); setUnit('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Card title="Custom habits">
      {customHabits.length === 0 ? (
        <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">No custom habits yet.</p>
      ) : (
        <ul className="mb-3 flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
          {customHabits.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-zinc-800 dark:text-zinc-200">
                {h.label} <span className="text-xs text-zinc-500 dark:text-zinc-400">({h.type === 'tick' ? 'tick' : `number${h.target != null ? `, target ${h.target}${h.unit ?? ''}` : ''}`})</span>
              </span>
              <motion.button {...tapScale} type="button" onClick={() => onDelete(h.id)} className="min-h-9 cursor-pointer rounded-lg px-3 text-xs font-medium text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-500/10">
                Remove
              </motion.button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex flex-col gap-2">
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Stretching" className={inputClass} />
        <div className="grid grid-cols-3 gap-2">
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
            <option value="tick">Tick</option>
            <option value="number">Number</option>
          </select>
          {type === 'number' && (
            <>
              <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target" className={inputClass} />
              <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" className={inputClass} />
            </>
          )}
        </div>
        <motion.button {...tapScale} type="submit" disabled={adding || !label.trim()} className="min-h-11 cursor-pointer rounded-xl bg-pink-600 text-sm font-semibold text-white disabled:opacity-50 dark:bg-emerald-400 dark:text-zinc-950">
          Add habit
        </motion.button>
      </form>
    </Card>
  )
}

function BackupCard({ userId }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const exportJson = async () => {
    setBusy(true)
    try {
      const backup = await exportAllTrainingData(userId)
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `training-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  const importJson = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setMessage('')
    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      await importAllTrainingData(userId, backup)
      setMessage('Import complete. Reload the page to see it.')
    } catch (err) {
      setMessage(`Import failed: ${err.message}`)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Card title="Backup">
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">Export everything as a JSON file, or restore from one.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <motion.button {...tapScale} type="button" onClick={exportJson} disabled={busy} className="min-h-11 flex-1 cursor-pointer rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-700 disabled:opacity-50 dark:bg-white/10 dark:text-zinc-200">
          Export JSON
        </motion.button>
        <motion.button {...tapScale} type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="min-h-11 flex-1 cursor-pointer rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-700 disabled:opacity-50 dark:bg-white/10 dark:text-zinc-200">
          Import JSON
        </motion.button>
        <input ref={fileRef} type="file" accept="application/json" onChange={importJson} className="hidden" />
      </div>
      {message && <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{message}</p>}
    </Card>
  )
}

export default function TrainingSettingsPage() {
  const { user } = useAuth()
  const t = useTrainingData(user?.id)

  if (t.loading) {
    return <p className="mx-auto max-w-2xl px-5 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  }
  if (t.error || !t.settings) {
    return (
      <p className="mx-auto max-w-2xl px-5 py-6 text-sm text-red-600 dark:text-red-400">
        Couldn't load your training data{t.error ? `: ${t.error}` : ''}. If this says a table is missing, the habit-tracker
        migration (supabase/migration_habit_tracker.sql) needs to be run in the Supabase SQL editor first.
      </p>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-10">
      <TrainingSubNav />
      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem><GoalSettingsCard settings={t.settings} onSave={t.saveSettings} /></FadeInItem>

        <FadeInItem>
          <Card title="Default weekly template">
            <div className="flex flex-col gap-3">
              {t.template.map((row) => (
                <TemplateDayRow key={row.weekday} row={row} onSave={t.saveTemplateDay} />
              ))}
            </div>
          </Card>
        </FadeInItem>

        <FadeInItem>
          <CustomHabitsCard customHabits={t.customHabits} onAdd={t.addCustomHabit} onDelete={t.deleteCustomHabit} />
        </FadeInItem>

        <FadeInItem><BackupCard userId={user.id} /></FadeInItem>
      </FadeInStagger>
    </main>
  )
}
