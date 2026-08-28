import { useState } from 'react'
import Card from '../components/Card'
import StrengthSubNav from '../components/StrengthSubNav'
import { FadeInItem, FadeInStagger, tapScale } from '../components/motion'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useStrengthProgram } from '../hooks/useStrengthProgram'

const inputClass =
  'min-h-10 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400'

function emptyExercise() {
  return { name: '', target_sets: '3', target_reps: '10', target_weight_kg: '' }
}

function AddDayForm({ onAdd }) {
  const [label, setLabel] = useState('')
  const [isOptional, setIsOptional] = useState(false)
  const [adding, setAdding] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!label.trim()) return
    setAdding(true)
    try {
      await onAdd(label.trim(), isOptional)
      setLabel('')
      setIsOptional(false)
    } finally {
      setAdding(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Upper" className={inputClass} />
      <label className="flex shrink-0 items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
        <input type="checkbox" checked={isOptional} onChange={(e) => setIsOptional(e.target.checked)} className="h-4 w-4 rounded" />
        Optional
      </label>
      <motion.button
        {...tapScale}
        type="submit"
        disabled={adding || !label.trim()}
        className="min-h-10 shrink-0 rounded-lg bg-pink-600 dark:bg-emerald-400 px-4 text-sm font-medium text-white dark:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Add day
      </motion.button>
    </form>
  )
}

function ExerciseRow({ exercise, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: exercise.name,
    target_sets: String(exercise.target_sets),
    target_reps: String(exercise.target_reps),
    target_weight_kg: String(exercise.target_weight_kg),
  })
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      await onUpdate(exercise.id, {
        name: form.name.trim(),
        target_sets: Number(form.target_sets) || 1,
        target_reps: Number(form.target_reps) || 1,
        target_weight_kg: Number(form.target_weight_kg) || 0,
      })
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-5 sm:items-center">
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={`${inputClass} sm:col-span-2`} placeholder="Exercise" />
        <input type="number" min="1" value={form.target_sets} onChange={(e) => setForm((f) => ({ ...f, target_sets: e.target.value }))} className={inputClass} placeholder="Sets" />
        <input type="number" min="1" value={form.target_reps} onChange={(e) => setForm((f) => ({ ...f, target_reps: e.target.value }))} className={inputClass} placeholder="Reps" />
        <div className="flex gap-1.5">
          <input type="number" min="0" step="0.5" value={form.target_weight_kg} onChange={(e) => setForm((f) => ({ ...f, target_weight_kg: e.target.value }))} className={inputClass} placeholder="kg (optional)" />
          <button type="button" disabled={busy} onClick={save} className="shrink-0 rounded-lg bg-pink-600 dark:bg-emerald-400 px-3 text-xs font-medium text-white dark:text-zinc-950 disabled:opacity-50">
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-2.5 text-sm dark:border-white/10 dark:bg-white/5">
      <div>
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{exercise.name}</span>
        <span className="ml-2 text-zinc-500 dark:text-zinc-400">
          {exercise.target_sets} &times; {exercise.target_reps}
          {exercise.target_weight_kg > 0 ? ` @ ${exercise.target_weight_kg}kg` : ' -- not logged yet'}
        </span>
      </div>
      <div className="flex shrink-0 gap-3 text-xs font-medium">
        <button type="button" onClick={() => setEditing(true)} className="text-zinc-500 hover:underline dark:text-zinc-400">
          Edit
        </button>
        <button type="button" onClick={() => onRemove(exercise.id)} className="text-red-600 hover:underline dark:text-red-400">
          Remove
        </button>
      </div>
    </div>
  )
}

function DayCard({ day, onAddExercise, onUpdateExercise, onRemoveExercise, onRemoveDay }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyExercise())
  const [adding, setAdding] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setAdding(true)
    try {
      await onAddExercise(day.id, {
        name: form.name.trim(),
        target_sets: Number(form.target_sets) || 1,
        target_reps: Number(form.target_reps) || 1,
        target_weight_kg: Number(form.target_weight_kg) || 0,
      })
      setForm(emptyExercise())
      setShowAdd(false)
    } finally {
      setAdding(false)
    }
  }

  return (
    <Card title={day.is_optional ? `${day.label} (optional)` : day.label}>
      <div className="flex flex-col gap-2">
        {day.exercises.length === 0 && !showAdd && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No exercises yet.</p>
        )}
        {day.exercises.map((ex) => (
          <ExerciseRow key={ex.id} exercise={ex} onUpdate={onUpdateExercise} onRemove={onRemoveExercise} />
        ))}
      </div>

      {showAdd ? (
        <form onSubmit={handleAdd} className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-dashed border-zinc-300 p-2.5 dark:border-white/15 sm:grid-cols-5 sm:items-center">
          <input autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={`${inputClass} sm:col-span-2`} placeholder="Exercise name" />
          <input type="number" min="1" value={form.target_sets} onChange={(e) => setForm((f) => ({ ...f, target_sets: e.target.value }))} className={inputClass} placeholder="Sets" />
          <input type="number" min="1" value={form.target_reps} onChange={(e) => setForm((f) => ({ ...f, target_reps: e.target.value }))} className={inputClass} placeholder="Reps" />
          <div className="flex gap-1.5">
            <input type="number" min="0" step="0.5" value={form.target_weight_kg} onChange={(e) => setForm((f) => ({ ...f, target_weight_kg: e.target.value }))} className={inputClass} placeholder="kg (optional)" />
            <button type="submit" disabled={adding || !form.name.trim()} className="shrink-0 rounded-lg bg-pink-600 dark:bg-emerald-400 px-3 text-xs font-medium text-white dark:text-zinc-950 disabled:opacity-50">
              Add
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={() => setShowAdd(true)} className="text-xs font-medium text-pink-600 hover:underline dark:text-emerald-400">
            + Add exercise
          </button>
          <button type="button" onClick={() => onRemoveDay(day.id)} className="text-xs font-medium text-red-600 hover:underline dark:text-red-400">
            Remove day
          </button>
        </div>
      )}
    </Card>
  )
}

export default function StrengthProgramPage() {
  const { user } = useAuth()
  const { days, loading, error, addDay, removeDay, addExercise, updateExercise, removeExercise } = useStrengthProgram(user?.id)

  if (loading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  }
  if (error) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-600 dark:text-red-400">Couldn't load your program: {error}</p>
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem className="flex flex-col gap-3">
          <StrengthSubNav />
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Strength program</h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Set this up once with your actual programme -- days, exercises, sets/reps. Weight isn't a fixed target: leave it blank or put in
              wherever you're starting, and it'll track itself upward from what you actually log each time.
            </p>
          </div>
        </FadeInItem>

        {days.map((day) => (
          <FadeInItem key={day.id}>
            <DayCard day={day} onAddExercise={addExercise} onUpdateExercise={updateExercise} onRemoveExercise={removeExercise} onRemoveDay={removeDay} />
          </FadeInItem>
        ))}

        <FadeInItem>
          <Card title="Add a day">
            <AddDayForm onAdd={addDay} />
          </Card>
        </FadeInItem>
      </FadeInStagger>
    </main>
  )
}
