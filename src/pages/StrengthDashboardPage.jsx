import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card'
import StrengthSubNav from '../components/StrengthSubNav'
import { FadeInItem, FadeInStagger, tapScale } from '../components/motion'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useStrengthProgram } from '../hooks/useStrengthProgram'
import * as db from '../lib/strength/db'
import { formatDate } from '../lib/running/format'

function scoreClass(score) {
  if (score === null || score === undefined) return 'text-zinc-400 dark:text-zinc-500'
  if (score >= 90) return 'text-emerald-600 dark:text-emerald-400'
  if (score < 70) return 'text-amber-600 dark:text-amber-400'
  return 'text-zinc-600 dark:text-zinc-300'
}

function DayCard({ day, latestSession }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{day.label}</h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{day.exercises.length} exercise{day.exercises.length === 1 ? '' : 's'}</p>
        </div>
        {latestSession && (
          <div className={`text-right text-sm font-semibold ${scoreClass(latestSession.score)}`}>
            {latestSession.score ?? '—'}<span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">/100</span>
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {latestSession ? `Last logged ${formatDate(latestSession.session_date)}` : 'Not logged yet'}
      </p>

      <Link to={`/training/strength/log/${day.id}`}>
        <motion.div
          {...tapScale}
          className="mt-3 flex min-h-10 cursor-pointer items-center justify-center rounded-lg bg-pink-600 dark:bg-emerald-400 text-sm font-medium text-white dark:text-zinc-950"
        >
          Log this session
        </motion.div>
      </Link>
    </Card>
  )
}

export default function StrengthDashboardPage() {
  const { user } = useAuth()
  const { days, loading: programLoading, error: programError } = useStrengthProgram(user?.id)
  const [latestByDay, setLatestByDay] = useState({})
  const [sessionsLoading, setSessionsLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    db.getLatestSessionPerDay(user.id)
      .then((map) => { if (!cancelled) setLatestByDay(map) })
      .finally(() => { if (!cancelled) setSessionsLoading(false) })
    return () => { cancelled = true }
  }, [user?.id])

  if (programLoading || sessionsLoading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  }
  if (programError) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-600 dark:text-red-400">Couldn't load your program: {programError}</p>
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem className="flex flex-col gap-3">
          <StrengthSubNav />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Strength</h1>
        </FadeInItem>

        <FadeInItem>
          {days.length === 0 ? (
            <Card>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No program set up yet. <Link to="/training/strength/program" className="font-medium text-pink-600 hover:underline dark:text-emerald-400">Add your days and exercises</Link> to get started.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {days.map((day) => (
                <DayCard key={day.id} day={day} latestSession={latestByDay[day.id]} />
              ))}
            </div>
          )}
        </FadeInItem>
      </FadeInStagger>
    </main>
  )
}
