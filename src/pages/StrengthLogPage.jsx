import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Card from '../components/Card'
import StrengthSubNav from '../components/StrengthSubNav'
import { FadeInItem, FadeInStagger, tapScale } from '../components/motion'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import * as db from '../lib/strength/db'
import { computeExerciseScore, computeSessionScore, computeSetScore } from '../lib/strength/scoring'

const inputClass =
  'min-h-10 w-20 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-2 text-center text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400'

function buildInitialSets(exercise) {
  return Array.from({ length: exercise.target_sets }, () => ({
    reps: String(exercise.target_reps),
    weight_kg: String(exercise.target_weight_kg),
  }))
}

function ExerciseLogRows({ exercise, sets, onChange }) {
  return (
    <Card>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{exercise.name}</h3>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Target: {exercise.target_sets} &times; {exercise.target_reps} @ {exercise.target_weight_kg}kg
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 dark:text-zinc-500">
          <span className="w-10">Set</span>
          <span className="w-20 text-center">Reps</span>
          <span className="w-20 text-center">kg</span>
        </div>
        {sets.map((set, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-10 text-sm text-zinc-500 dark:text-zinc-400">{i + 1}</span>
            <input
              type="number"
              min="0"
              value={set.reps}
              onChange={(e) => onChange(i, { ...set, reps: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              min="0"
              step="0.5"
              value={set.weight_kg}
              onChange={(e) => onChange(i, { ...set, weight_kg: e.target.value })}
              className={inputClass}
            />
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function StrengthLogPage() {
  const { user } = useAuth()
  const { plannedSessionId } = useParams()
  const navigate = useNavigate()

  const [plannedSession, setPlannedSession] = useState(null)
  const [day, setDay] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [logsByExercise, setLogsByExercise] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    async function load() {
      const planned = await db.getPlannedSessionById(user.id, plannedSessionId)
      if (cancelled || !planned) return
      const d = await db.getDayWithExercises(user.id, planned.day_id)
      if (cancelled || !d) return
      setPlannedSession(planned)
      setDay(d)
      const initial = {}
      for (const ex of d.exercises) initial[ex.id] = buildInitialSets(ex)
      setLogsByExercise(initial)
    }
    load()
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id, plannedSessionId])

  function updateSet(exerciseId, setIndex, next) {
    setLogsByExercise((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, i) => (i === setIndex ? next : s)),
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!day) return
    setSubmitting(true)
    setError(null)
    try {
      const session = await db.createSession(user.id, {
        day_id: day.id,
        planned_session_id: plannedSession?.id ?? null,
        session_date: new Date().toISOString().slice(0, 10),
      })

      const rows = []
      const exerciseScores = []
      for (const ex of day.exercises) {
        const sets = logsByExercise[ex.id] ?? []
        const setScores = []
        sets.forEach((s, i) => {
          const reps = Number(s.reps) || 0
          const weight = Number(s.weight_kg) || 0
          rows.push({ session_id: session.id, exercise_id: ex.id, set_number: i + 1, reps, weight_kg: weight })
          setScores.push(computeSetScore(reps, weight, ex.target_reps, ex.target_weight_kg))
        })
        exerciseScores.push(computeExerciseScore(setScores))
      }

      await db.insertSetLogs(user.id, rows)
      const sessionScore = computeSessionScore(exerciseScores)
      await db.updateSessionScore(user.id, session.id, sessionScore)
      if (plannedSession) await db.markPlannedSessionStatus(user.id, plannedSession.id, 'completed')

      navigate(`/training/strength/history/${session.id}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  }
  if (error || !day) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-600 dark:text-red-400">{error ?? 'Day not found.'}</p>
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <form onSubmit={handleSubmit}>
        <FadeInStagger className="flex flex-col gap-5">
          <FadeInItem className="flex flex-col gap-3">
            <StrengthSubNav />
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Log: {day.label}</h1>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">Pre-filled with target reps/weight -- edit whatever you actually did.</p>
            </div>
          </FadeInItem>

          {day.exercises.map((ex) => (
            <FadeInItem key={ex.id}>
              <ExerciseLogRows exercise={ex} sets={logsByExercise[ex.id] ?? []} onChange={(i, next) => updateSet(ex.id, i, next)} />
            </FadeInItem>
          ))}

          <FadeInItem>
            {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <motion.button
              {...tapScale}
              type="submit"
              disabled={submitting}
              className="min-h-11 w-full rounded-lg bg-pink-600 dark:bg-emerald-400 text-sm font-medium text-white dark:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6"
            >
              {submitting ? 'Saving…' : 'Save session'}
            </motion.button>
          </FadeInItem>
        </FadeInStagger>
      </form>
    </main>
  )
}
