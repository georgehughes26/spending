import { useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card'
import StrengthSubNav from '../components/StrengthSubNav'
import { CheckIcon, SkipIcon } from '../components/RunningIcons'
import { FadeInItem, FadeInStagger, tapScale } from '../components/motion'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useStrengthWeek } from '../hooks/useStrengthWeek'
import { useStrengthInsights } from '../hooks/useStrengthInsights'
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

function OverallProgressionTile({ overall }) {
  if (!overall) {
    return (
      <Card title="Overall progression">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Log the same exercise twice to start seeing progression.</p>
      </Card>
    )
  }
  const pctText = `${overall.avgPct >= 0 ? '+' : ''}${(overall.avgPct * 100).toFixed(1)}%`
  return (
    <Card title="Overall progression">
      <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{pctText}</div>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">average weight change across {overall.trackedCount} tracked exercise{overall.trackedCount === 1 ? '' : 's'}</p>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{overall.up} up</span>
        {' · '}
        <span>{overall.flat} flat</span>
        {' · '}
        <span className="text-amber-600 dark:text-amber-400 font-medium">{overall.down} down</span>
      </p>
    </Card>
  )
}

function BestProgressTile({ progression }) {
  const top = progression.slice(0, 3)
  return (
    <Card title="Progressing best">
      {top.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Not enough history yet.</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {top.map((row) => (
              <div key={row.exercise.id} className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{row.exercise.name}</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {row.firstWeightKg}kg &rarr; {row.currentWeightKg}kg ({row.deltaPct >= 0 ? '+' : ''}{(row.deltaPct * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">The % also credits reps climbing toward the top of your range at the same weight, so it can move even when the kg shown hasn't.</p>
        </>
      )}
    </Card>
  )
}

const TIER_CLASS = {
  Elite: 'text-emerald-600 dark:text-emerald-400',
  Advanced: 'text-emerald-600 dark:text-emerald-400',
  Intermediate: 'text-zinc-600 dark:text-zinc-300',
  Novice: 'text-amber-600 dark:text-amber-400',
  Beginner: 'text-amber-600 dark:text-amber-400',
  Untrained: 'text-amber-600 dark:text-amber-400',
}

function PopulationCompareTile({ populationComparison, hasBodyweight, hasAge }) {
  const top = populationComparison.slice(0, 4)
  return (
    <Card title="How you compare">
      {!hasBodyweight || !hasAge ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Add your weight and age on the <Link to="/training/strength/program" className="text-pink-600 hover:underline dark:text-emerald-400">Program page</Link> to see this.
        </p>
      ) : top.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">None of your exercises have published population standards to compare against yet.</p>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {top.map((row) => (
              <div key={row.exercise.id} className="text-sm">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{row.exercise.name}</div>
                <div className={TIER_CLASS[row.tier] ?? ''}>
                  {row.tier}{row.next ? <span className="text-zinc-400 dark:text-zinc-500"> ({row.progressPct}% to {row.next})</span> : ''}
                  {row.approx && <span className="text-zinc-400 dark:text-zinc-500"> *</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            Against published strength standards for men, adjusted for your age and bodyweight. * = closest available standard, not an exact match for that exercise.
          </p>
        </>
      )}
    </Card>
  )
}

function NeedsAttentionTile({ ready, struggling }) {
  return (
    <Card title="Needs upping / attention">
      {ready.length === 0 && struggling.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing flagged right now.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ready.map(({ exercise, suggestion }) => (
            <div key={exercise.id} className="text-sm">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{exercise.name}</span>
              <span className="text-zinc-500 dark:text-zinc-400"> -- try {suggestion.suggestedWeightKg}kg next time</span>
            </div>
          ))}
          {struggling.map(({ exercise }) => (
            <div key={exercise.id} className="text-sm">
              <span className="font-medium text-amber-600 dark:text-amber-400">{exercise.name}</span>
              <span className="text-zinc-500 dark:text-zinc-400"> -- hold or ease back</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function StrengthDashboardPage() {
  const { user } = useAuth()
  const { week, plannedSessions, sessionsByPlanned, loading, error, markDoneNoFile, skip, unskip, startNextWeek } = useStrengthWeek(user?.id)
  const insights = useStrengthInsights(user?.id)
  const [advancing, setAdvancing] = useState(false)

  if (loading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  }
  if (error) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-600 dark:text-red-400">Couldn't load this week: {error}</p>
  }

  // Required (non-optional) days all resolved -- ready to move on without
  // waiting for the calendar to actually reach next Monday.
  const requiredSessions = plannedSessions.filter((p) => !p.is_optional)
  const allRequiredDone = requiredSessions.length > 0 && requiredSessions.every((p) => p.status !== 'upcoming')

  async function handleStartNextWeek() {
    setAdvancing(true)
    try {
      await startNextWeek()
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem className="flex flex-col gap-3">
          <StrengthSubNav />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{week ? weekCommencingLabel(week.start_date) : 'Strength'}</h1>
        </FadeInItem>

        <FadeInItem className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <OverallProgressionTile overall={insights.overall} />
          <BestProgressTile progression={insights.progression} />
          <PopulationCompareTile
            populationComparison={insights.populationComparison}
            hasBodyweight={!!insights.profile?.weight_kg}
            hasAge={!!insights.profile?.age}
          />
          <NeedsAttentionTile ready={insights.ready} struggling={insights.struggling} />
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

        {allRequiredDone && (
          <FadeInItem>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-600 dark:text-zinc-300">All done for this week -- ready to move on?</p>
                <motion.button
                  {...tapScale}
                  type="button"
                  disabled={advancing}
                  onClick={handleStartNextWeek}
                  className="min-h-10 rounded-lg bg-pink-600 dark:bg-emerald-400 px-4 text-sm font-medium text-white dark:text-zinc-950 disabled:opacity-50"
                >
                  {advancing ? 'Starting…' : 'Start next week'}
                </motion.button>
              </div>
            </Card>
          </FadeInItem>
        )}
      </FadeInStagger>
    </main>
  )
}
