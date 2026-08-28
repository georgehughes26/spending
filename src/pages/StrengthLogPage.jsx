import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Card from '../components/Card'
import StrengthSubNav from '../components/StrengthSubNav'
import { FadeInItem, FadeInStagger, tapScale } from '../components/motion'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import * as db from '../lib/strength/db'
import { computeExerciseScore, computeSessionScore, computeSetScore } from '../lib/strength/scoring'
import { fetchExerciseSets, listStrengthActivities } from '../lib/garmin/edgeClient'

const inputClass =
  'min-h-10 w-20 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-2 text-center text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400'

function buildInitialSets(exercise) {
  return Array.from({ length: exercise.target_sets }, () => ({
    reps: String(exercise.target_reps),
    weight_kg: String(exercise.target_weight_kg),
  }))
}

/**
 * Maps Garmin's ACTIVE sets onto the day's exercises in order -- the
 * exerciseSets endpoint returns sets chronologically, which matches the
 * program's exercise/set order as long as they were done in that order.
 * Anything beyond what Garmin returned keeps its target-prefilled default,
 * so a mismatch (extra/missing sets) is just left for manual review rather
 * than silently dropped or guessed at.
 */
function applyGarminSets(dayExercises, activeSets) {
  const logs = {}
  let cursor = 0
  for (const ex of dayExercises) {
    const sets = []
    for (let i = 0; i < ex.target_sets; i++) {
      const g = activeSets[cursor]
      cursor++
      if (g) {
        const weightKg = g.weight != null ? Math.round((g.weight / 1000) * 2) / 2 : ex.target_weight_kg
        sets.push({ reps: String(g.repetitionCount ?? ex.target_reps), weight_kg: String(weightKg) })
      } else {
        sets.push({ reps: String(ex.target_reps), weight_kg: String(ex.target_weight_kg) })
      }
    }
    logs[ex.id] = sets
  }
  return { logs, totalSlots: cursor }
}

function GarminFetchPanel({ userId, dayExercises, onApply }) {
  const [open, setOpen] = useState(false)
  const [activities, setActivities] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  async function handleOpen() {
    setOpen(true)
    setError(null)
    if (activities) return
    setLoading(true)
    try {
      setActivities(await listStrengthActivities(userId, 8))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePick(activityId) {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const sets = await fetchExerciseSets(userId, activityId)
      const active = sets.filter((s) => s.setType === 'ACTIVE')
      const { logs, totalSlots } = applyGarminSets(dayExercises, active)
      onApply(logs)
      setMessage(
        active.length === totalSlots
          ? `Matched all ${totalSlots} sets from Garmin.`
          : `Matched ${Math.min(active.length, totalSlots)} of ${totalSlots} sets from Garmin (${active.length} found on the activity) -- check the rest before saving.`,
      )
      setOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <motion.button
        {...tapScale}
        type="button"
        onClick={handleOpen}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/5"
      >
        Fetch from Garmin
      </motion.button>

      {message && <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{message}</p>}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {open && (
        <div className="mt-2 flex flex-col gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          {loading && <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading…</p>}
          {!loading && activities?.length === 0 && <p className="text-xs text-zinc-500 dark:text-zinc-400">No recent strength activities found on Garmin.</p>}
          {!loading && activities?.map((a) => (
            <button
              key={a.activityId}
              type="button"
              onClick={() => handlePick(a.activityId)}
              className="rounded-md px-2 py-1.5 text-left text-xs text-zinc-700 hover:bg-white dark:text-zinc-300 dark:hover:bg-white/5"
            >
              {a.name} -- {new Date(a.startTimeLocal).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </button>
          ))}
          <button type="button" onClick={() => setOpen(false)} className="mt-1 text-left text-xs text-zinc-400 hover:underline dark:text-zinc-500">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
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

  function applyFetchedLogs(logs) {
    setLogsByExercise(logs)
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Log: {day.label}</h1>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">Pre-filled with target reps/weight -- edit whatever you actually did, or fetch it from a completed Garmin session.</p>
              </div>
              <GarminFetchPanel userId={user.id} dayExercises={day.exercises} onApply={applyFetchedLogs} />
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
