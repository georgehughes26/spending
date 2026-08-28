import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Card from '../components/Card'
import StrengthSubNav from '../components/StrengthSubNav'
import { FadeInItem, FadeInStagger, tapScale } from '../components/motion'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import * as db from '../lib/strength/db'
import { computeSetScore, suggestProgression } from '../lib/strength/scoring'
import { formatDate } from '../lib/running/format'

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

function ExerciseBlock({ name, sets, suggestion }) {
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
            {sets.map((s) => (
              <tr key={s.set_number} className="border-t border-zinc-100 dark:border-white/5">
                <td className="py-1.5 text-zinc-900 dark:text-zinc-100">{s.set_number}</td>
                <td className="py-1.5 text-zinc-900 dark:text-zinc-100">{s.reps}</td>
                <td className="py-1.5 text-zinc-900 dark:text-zinc-100">{s.weight_kg}</td>
                <td className="py-1.5 text-zinc-500 dark:text-zinc-400">{s.target_reps} @ {s.target_weight_kg}kg</td>
                <td className={`py-1.5 font-medium ${scoreClass(computeSetScore(s.reps, s.weight_kg, s.target_reps, s.target_weight_kg))}`}>
                  {computeSetScore(s.reps, s.weight_kg, s.target_reps, s.target_weight_kg)}
                </td>
              </tr>
            ))}
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

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    async function load() {
      try {
        const s = await db.getSessionById(user.id, id)
        if (!s) throw new Error('Session not found')
        const logs = await db.getSetLogsForSession(user.id, id)

        const byExercise = new Map()
        for (const log of logs) {
          if (!byExercise.has(log.exercise_id)) byExercise.set(log.exercise_id, { name: log.exercise_name, sets: [] })
          byExercise.get(log.exercise_id).sets.push(log)
        }

        const withSuggestions = await Promise.all(
          [...byExercise.entries()].map(async ([exerciseId, group]) => {
            const first = group.sets[0]
            const recent = await db.getRecentLogsForExercise(user.id, exerciseId, 3)
            const suggestion = suggestProgression(
              { target_reps: first.target_reps, target_weight_kg: first.target_weight_kg },
              recent,
            )
            return { ...group, suggestion }
          }),
        )

        if (!cancelled) {
          setSession(s)
          setGroups(withSuggestions)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id, id])

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

  if (loading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  }
  if (error || !session) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-600 dark:text-red-400">{error ?? 'Session not found.'}</p>
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem>
          <StrengthSubNav />
        </FadeInItem>

        <FadeInItem>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{session.day_label}</h1>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{formatDate(session.session_date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold ${scoreClass(session.score)}`}>
                  {session.score ?? '—'}<span className="text-sm font-normal text-zinc-400 dark:text-zinc-500">/100</span>
                </span>
                <motion.button
                  {...tapScale}
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40 dark:text-red-400"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </motion.button>
              </div>
            </div>
          </Card>
        </FadeInItem>

        {groups.map((g) => (
          <FadeInItem key={g.name}>
            <ExerciseBlock name={g.name} sets={g.sets} suggestion={g.suggestion} />
          </FadeInItem>
        ))}
      </FadeInStagger>
    </main>
  )
}
