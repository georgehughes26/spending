import { Link } from 'react-router-dom'
import Card from '../components/Card'
import StrengthSubNav from '../components/StrengthSubNav'
import { FadeInItem, FadeInStagger } from '../components/motion'
import { useAuth } from '../context/AuthContext'
import { useStrengthSessions } from '../hooks/useStrengthSessions'
import { formatDate } from '../lib/running/format'

function scoreClass(score) {
  if (score === null || score === undefined) return 'text-zinc-400 dark:text-zinc-500'
  if (score >= 90) return 'text-emerald-600 dark:text-emerald-400'
  if (score < 70) return 'text-amber-600 dark:text-amber-400'
  return 'text-zinc-600 dark:text-zinc-300'
}

export default function StrengthHistoryPage() {
  const { user } = useAuth()
  const { sessions, loading, error } = useStrengthSessions(user?.id)

  if (loading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  }
  if (error) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-600 dark:text-red-400">Couldn't load your history: {error}</p>
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem className="flex flex-col gap-3">
          <StrengthSubNav />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Strength history</h1>
        </FadeInItem>

        <FadeInItem>
          {sessions.length === 0 ? (
            <Card>
              <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">No sessions logged yet.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map((s) => (
                <Link
                  key={s.id}
                  to={`/training/strength/history/${s.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{s.day_label}</span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">{formatDate(s.session_date)}</span>
                  </div>
                  <span className={`text-sm font-semibold ${scoreClass(s.score)}`}>
                    {s.score ?? '—'}<span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">/100</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </FadeInItem>
      </FadeInStagger>
    </main>
  )
}
