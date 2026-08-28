import { useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card'
import StrengthSubNav from '../components/StrengthSubNav'
import { CheckIcon, SkipIcon } from '../components/RunningIcons'
import { FadeInItem, FadeInStagger, tapScale } from '../components/motion'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useStrengthWeek } from '../hooks/useStrengthWeek'
import { weekCommencingLabel } from '../lib/strength/format'

function scoreClass(score) {
  if (score === null || score === undefined) return 'text-zinc-400 dark:text-zinc-500'
  if (score >= 90) return 'text-emerald-600 dark:text-emerald-400'
  if (score < 70) return 'text-amber-600 dark:text-amber-400'
  return 'text-zinc-600 dark:text-zinc-300'
}

function SessionCard({ planned, session, onMarkDoneNoFile, onSkip, onUnskip }) {
  const [busy, setBusy] = useState(false)

  async function act(fn) {
    setBusy(true)
    try {
      await fn(planned.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {planned.day_label}
            {planned.is_optional && <span className="ml-1.5 text-xs font-normal text-zinc-400 dark:text-zinc-500">(optional)</span>}
          </h3>
        </div>
        {session && (
          <div className={`text-right text-sm font-semibold ${scoreClass(session.score)}`}>
            {session.score != null ? <>{session.score}<span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">/100</span></> : <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">no score yet</span>}
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-white/10">
        {planned.status === 'completed' ? (
          <Link to={`/training/strength/history/${session?.id}`} className="text-sm font-medium text-pink-600 hover:underline dark:text-emerald-400">
            View session →
          </Link>
        ) : planned.status === 'skipped' ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <SkipIcon className="h-3.5 w-3.5" />
              Skipped
            </span>
            <button type="button" disabled={busy} onClick={() => act(onUnskip)} className="text-xs font-medium text-pink-600 hover:underline disabled:opacity-40 dark:text-emerald-400">
              Undo
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Link to={`/training/strength/log/${planned.id}`}>
              <motion.div
                {...tapScale}
                className="flex min-h-10 cursor-pointer items-center justify-center rounded-lg bg-pink-600 dark:bg-emerald-400 text-sm font-medium text-white dark:text-zinc-950"
              >
                Log manually
              </motion.div>
            </Link>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => act(onMarkDoneNoFile)}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline disabled:opacity-40 dark:text-emerald-400"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                Mark done (no log)
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => act(onSkip)}
                className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:underline disabled:opacity-40 dark:text-zinc-400"
              >
                <SkipIcon className="h-3.5 w-3.5" />
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default function StrengthDashboardPage() {
  const { user } = useAuth()
  const { week, plannedSessions, sessionsByPlanned, loading, error, markDoneNoFile, skip, unskip } = useStrengthWeek(user?.id)

  if (loading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  }
  if (error) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-600 dark:text-red-400">Couldn't load this week: {error}</p>
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem className="flex flex-col gap-3">
          <StrengthSubNav />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{week ? weekCommencingLabel(week.start_date) : 'Strength'}</h1>
        </FadeInItem>

        <FadeInItem>
          {plannedSessions.length === 0 ? (
            <Card>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No program set up yet. <Link to="/training/strength/program" className="font-medium text-pink-600 hover:underline dark:text-emerald-400">Add your days and exercises</Link> to get started.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plannedSessions.map((planned) => (
                <SessionCard
                  key={planned.id}
                  planned={planned}
                  session={sessionsByPlanned[planned.id]}
                  onMarkDoneNoFile={markDoneNoFile}
                  onSkip={skip}
                  onUnskip={unskip}
                />
              ))}
            </div>
          )}
        </FadeInItem>
      </FadeInStagger>
    </main>
  )
}
