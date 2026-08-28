import Card from '../components/Card'
import ProgressBar from '../components/ProgressBar'
import RunningPlanCard from '../components/RunningPlanCard'
import RunningSubNav from '../components/RunningSubNav'
import { FadeInItem, FadeInStagger } from '../components/motion'
import { useAuth } from '../context/AuthContext'
import { useRunningProfile } from '../hooks/useRunningProfile'
import { useRunningPlan } from '../hooks/useRunningPlan'
import { anchorPaceForWeek } from '../lib/running/curve'
import { durationToString, formatDate } from '../lib/running/format'
import { PLAN_START_5K_SECONDS } from '../lib/running/constants'

export default function RunningDashboardPage() {
  const { user } = useAuth()
  const { profile, loading: profileLoading, error: profileError } = useRunningProfile(user?.id)
  const { weeks, runs, completedSummaries, loading: planLoading, error: planError, markDone, skip, unskip } = useRunningPlan(user?.id)

  if (profileLoading || planLoading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading your plan…</p>
  }
  if (profileError || planError) {
    return (
      <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-600 dark:text-red-400">
        Couldn't load your plan: {profileError ?? planError}
      </p>
    )
  }
  if (!profile) return null

  const totalWeeks = weeks.length
  const today = new Date().toISOString().slice(0, 10)
  const currentWeek = weeks.find((w) => w.start_date <= today && w.end_date >= today) ?? weeks[weeks.length - 1]
  const weekNumber = currentWeek?.week_number ?? 1
  const thisWeekRuns = runs.filter((r) => r.week_number === weekNumber)

  const projected5kSeconds = totalWeeks
    ? Math.round(anchorPaceForWeek(totalWeeks, weekNumber, profile.current_fitness_5k_equiv_seconds, totalWeeks) * 5)
    : profile.current_fitness_5k_equiv_seconds
  const onTrack = projected5kSeconds <= profile.goal_5k_seconds

  const slowAnchor = Math.max(PLAN_START_5K_SECONDS, profile.current_fitness_5k_equiv_seconds)
  const fastAnchor = Math.min(profile.goal_5k_seconds, profile.current_fitness_5k_equiv_seconds)
  const span = Math.max(slowAnchor - fastAnchor, 1)
  const fitnessProgressPct = Math.min(100, Math.max(0, ((slowAnchor - profile.current_fitness_5k_equiv_seconds) / span) * 100))

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem className="flex flex-col gap-3">
          <RunningSubNav />
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Week {weekNumber} of {totalWeeks}
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Building toward a sub-{durationToString(profile.goal_5k_seconds)} 5k by {formatDate(profile.goal_date)}.
            </p>
          </div>
        </FadeInItem>

        <FadeInItem className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card title="On track?">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{durationToString(projected5kSeconds)}</span>
              <span className={`text-sm font-medium ${onTrack ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {onTrack ? 'On track' : 'Behind'}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Projected 5k vs {durationToString(profile.goal_5k_seconds)} goal
            </p>
          </Card>

          <Card title="Current 5k fitness">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{durationToString(profile.current_fitness_5k_equiv_seconds)}</span>
            </div>
            <ProgressBar value={fitnessProgressPct} className="mt-3" />
            <div className="mt-1.5 flex justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
              <span>Baseline {durationToString(PLAN_START_5K_SECONDS)}</span>
              <span>Goal {durationToString(profile.goal_5k_seconds)}</span>
            </div>
          </Card>
        </FadeInItem>

        <FadeInItem>
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-pink-700 dark:text-emerald-400">This week</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {thisWeekRuns.map((run) => (
              <RunningPlanCard
                key={run.id}
                run={run}
                completedSummary={completedSummaries[run.id]}
                onMarkDone={run.status === 'upcoming' ? markDone : undefined}
                onSkip={run.status === 'upcoming' ? skip : undefined}
                onUnskip={run.status === 'skipped' ? unskip : undefined}
              />
            ))}
          </div>
        </FadeInItem>
      </FadeInStagger>
    </main>
  )
}
