import { Link } from 'react-router-dom'
import Card from '../components/Card'
import RunningTypeBadge from '../components/RunningTypeBadge'
import RunningVerdictBadge from '../components/RunningVerdictBadge'
import RunningScoreBadge from '../components/RunningScoreBadge'
import RunningSubNav from '../components/RunningSubNav'
import { FadeInItem, FadeInStagger } from '../components/motion'
import { useAuth } from '../context/AuthContext'
import { useRunningCompletedRuns } from '../hooks/useRunningCompletedRuns'
import { paceToString, formatDate } from '../lib/running/format'

export default function RunningHistoryPage() {
  const { user } = useAuth()
  const { runs, loading, error } = useRunningCompletedRuns(user?.id)

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
          <RunningSubNav />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Run history</h1>
        </FadeInItem>

        <FadeInItem>
          {runs.length === 0 ? (
            <Card>
              <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">No runs uploaded yet.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {runs.map((run) => (
                <Link
                  key={run.id}
                  to={`/running/history/${run.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
                >
                  <div className="flex items-center gap-3">
                    <RunningTypeBadge runType={run.run_type} />
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">{formatDate(run.run_date)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{run.distance_km.toFixed(2)}km</span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">{paceToString(run.avg_pace_sec_per_km)}</span>
                    <RunningScoreBadge score={run.rating} />
                    <RunningVerdictBadge verdict={run.verdict} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </FadeInItem>
      </FadeInStagger>
    </main>
  )
}
