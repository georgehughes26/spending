import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Card from '../components/Card'
import StrengthSubNav from '../components/StrengthSubNav'
import { FadeInItem, FadeInStagger, tapScale } from '../components/motion'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import * as db from '../lib/strength/db'
import { computeExerciseScore, computeSessionScore, computeSetScore, suggestProgression } from '../lib/strength/scoring'
import { formatDate } from '../lib/running/format'

const inputClass =
  'min-h-8 w-16 rounded-md border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-1.5 text-center text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400'

function scoreClass(score) {
  if (score === null || score === undefined) return 'text-zinc-400 dark:text-zinc-500'
  if (score >= 90) return 'text-emerald-600 dark:text-emerald-400'
  if (score < 70) return 'text-amber-600 dark:text-amber-400'
  return 'text-zinc-600 dark:text-zinc-300'
}

const ACTION_LABEL = {
  increase: 'Go up in weight',
  hold: 'Hold this weight',
  hold_or_reduce: 'Hold or ease back',
  no_data: 'Not tracked yet',
}

const ACTION_CLASS = {
  increase: 'text-emerald-600 dark:text-emerald-400',
  hold: 'text-zinc-600 dark:text-zinc-300',
  hold_or_reduce: 'text-amber-600 dark:text-amber-400',
  no_data: 'text-zinc-400 dark:text-zinc-500',
}

function ExerciseBlock({ name, sets, suggestion, editing, edited, onChangeSet }) {
  return (
    <Card>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{name}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-400 dark:text-zinc-500">
              <th className="pb-2 font-medium">Set</th>
              <th className="pb-2 font-medium">Reps</th>
              <th className="pb-2 font-medium">kg</th>
              <th className="pb-2 font-medium">Target</th>
              <th className="pb-2 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((s) => {
              const ed = editing ? edited?.[s.id] : null
              const reps = ed ? Number(ed.reps) || 0 : s.reps
              const weightKg = ed ? Number(ed.weight_kg) || 0 : s.weight_kg
              const score = computeSetScore(reps, weightKg, s.target_reps_max, s.target_weight_kg)
              return (
                <tr key={s.id} className="border-t border-zinc-100 dark:border-white/5">
                  <td className="py-1.5 text-zinc-900 dark:text-zinc-100">{s.set_number}</td>
                  <td className="py-1.5 text-zinc-900 dark:text-zinc-100">
                    {editing ? (
                      <input
                        type="number"
                        min="0"
                        value={ed?.reps ?? ''}
                        onChange={(e) => onChangeSet(s.id, 'reps', e.target.value)}
                        className={inputClass}
                      />
                    ) : (
                      s.reps
                    )}
                  </td>
                  <td className="py-1.5 text-zinc-900 dark:text-zinc-100">
                    {editing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={ed?.weight_kg ?? ''}
                        onChange={(e) => onChangeSet(s.id, 'weight_kg', e.target.value)}
                        className={inputClass}
                      />
                    ) : (
                      s.weight_kg
                    )}
                  </td>
                  <td className="py-1.5 text-zinc-500 dark:text-zinc-400">{s.target_reps_min}-{s.target_reps_max} @ {s.target_weight_kg}kg</td>
                  <td className={`py-1.5 font-medium ${scoreClass(score)}`}>{score}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {suggestion && (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.03]">
          <span className={`font-semibold ${ACTION_CLASS[suggestion.action]}`}>{ACTION_LABEL[suggestion.action]}</span>
          <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">{suggestion.reason}</p>
        </div>
      )}
    </Card>
  )
}

export default function StrengthHistoryDetailPage() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedSets, setEditedSets] = useState({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const s = await db.getSessionById(user.id, id)
    if (!s) throw new Error('Session not found')
    const logs = await db.getSetLogsForSession(user.id, id)

    const byExercise = new Map()
    for (const log of logs) {
      if (!byExercise.has(log.exercise_id)) byExercise.set(log.exercise_id, { exerciseId: log.exercise_id, name: log.exercise_name, sets: [] })
      byExercise.get(log.exercise_id).sets.push(log)
    }

    const withSuggestions = await Promise.all(
      [...byExercise.entries()].map(async ([exerciseId, group]) => {
        const first = group.sets[0]
        const recent = await db.getRecentLogsForExercise(user.id, exerciseId, 3)
        const suggestion = suggestProgression(
          { target_reps_min: first.target_reps_min, target_reps_max: first.target_reps_max, target_weight_kg: first.target_weight_kg },
          recent,
        )
        return { ...group, suggestion }
      }),
    )

    setSession(s)
    setGroups(withSuggestions)
  }, [user?.id, id])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    load()
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id, id, load])

  async function handleDelete() {
    if (!session || !window.confirm('Delete this session?')) return
    setDeleting(true)
    try {
      await db.deleteSession(user.id, session.id)
      navigate('/training/strength/history')
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  function startEditing() {
    const initial = {}
    for (const g of groups) {
      for (const s of g.sets) initial[s.id] = { reps: String(s.reps), weight_kg: String(s.weight_kg) }
    }
    setEditedSets(initial)
    setEditing(true)
  }

  function updateEditedSet(setId, field, value) {
    setEditedSets((prev) => ({ ...prev, [setId]: { ...prev[setId], [field]: value } }))
  }

  async function handleSaveEdits() {
    setSaving(true)
    setError(null)
    try {
      const writes = []
      for (const g of groups) {
        for (const s of g.sets) {
          const ed = editedSets[s.id]
          const reps = Number(ed.reps) || 0
          const weightKg = Number(ed.weight_kg) || 0
          if (reps !== s.reps || weightKg !== s.weight_kg) {
            writes.push(db.updateSetLog(user.id, s.id, { reps, weight_kg: weightKg }))
          }
        }
      }
      await Promise.all(writes)

      const exerciseScores = groups.map((g) =>
        computeExerciseScore(
          g.sets.map((s) => {
            const ed = editedSets[s.id]
            return computeSetScore(Number(ed.reps) || 0, Number(ed.weight_kg) || 0, s.target_reps_max, s.target_weight_kg)
          }),
        ),
      )
      await db.updateSessionScore(user.id, session.id, computeSessionScore(exerciseScores))

      // If this session is still an exercise's most recent, roll its tracked
      // weight forward to match the edited numbers -- same rule the log page
      // uses when a session is first saved.
      for (const g of groups) {
        const maxWeight = Math.max(0, ...g.sets.map((s) => Number(editedSets[s.id].weight_kg) || 0))
        if (maxWeight <= 0) continue
        const recent = await db.getRecentLogsForExercise(user.id, g.exerciseId, 1)
        if (recent.length && recent[0].session_date === session.session_date) {
          await db.updateExercise(user.id, g.exerciseId, { target_weight_kg: maxWeight })
        }
      }

      setEditing(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  }
  if (!session) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-600 dark:text-red-400">{error ?? 'Session not found.'}</p>
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem>
          <StrengthSubNav />
        </FadeInItem>

        {error && (
          <FadeInItem>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </FadeInItem>
        )}

        <FadeInItem>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{session.day_label}</h1>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{formatDate(session.session_date)}</p>
              </div>
              <div className="flex items-center gap-3">
                {session.score != null ? (
                  <span className={`text-2xl font-bold ${scoreClass(session.score)}`}>
                    {session.score}<span className="text-sm font-normal text-zinc-400 dark:text-zinc-500">/100</span>
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">No score -- first time logging, nothing to compare yet</span>
                )}
                {editing ? (
                  <>
                    <motion.button
                      {...tapScale}
                      type="button"
                      disabled={saving}
                      onClick={handleSaveEdits}
                      className="rounded-lg bg-pink-600 dark:bg-emerald-400 px-3 py-1.5 text-xs font-medium text-white dark:text-zinc-950 disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </motion.button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setEditing(false)}
                      className="text-xs font-medium text-zinc-500 hover:underline disabled:opacity-40 dark:text-zinc-400"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={startEditing}
                      className="text-xs font-medium text-pink-600 hover:underline dark:text-emerald-400"
                    >
                      Edit
                    </button>
                    <motion.button
                      {...tapScale}
                      type="button"
                      disabled={deleting}
                      onClick={handleDelete}
                      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40 dark:text-red-400"
                    >
                      {deleting ? 'Deleting…' : 'Delete'}
                    </motion.button>
                  </>
                )}
              </div>
            </div>
          </Card>
        </FadeInItem>

        {groups.map((g) => (
          <FadeInItem key={g.name}>
            <ExerciseBlock
              name={g.name}
              sets={g.sets}
              suggestion={g.suggestion}
              editing={editing}
              edited={editedSets}
              onChangeSet={updateEditedSet}
            />
          </FadeInItem>
        ))}
      </FadeInStagger>
    </main>
  )
}
