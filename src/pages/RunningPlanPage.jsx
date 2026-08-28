import RunningPlanCard from '../components/RunningPlanCard'
import RunningSubNav from '../components/RunningSubNav'
import { FadeInItem, FadeInStagger } from '../components/motion'
import { useAuth } from '../context/AuthContext'
import { useRunningPlan } from '../hooks/useRunningPlan'
import { formatDate, phaseLabel } from '../lib/running/format'
import { prescriptionTargetDistanceKm } from '../lib/running/prescriptions'

function totalWeekKm(runs) {
  const total = runs.reduce((sum, run) => sum + prescriptionTargetDistanceKm(run.prescription_json), 0)
  return Math.round(total * 10) / 10
}

export default function RunningPlanPage() {
  const { user } = useAuth()
  const { weeks, runs, completedSummaries, loading, error, markDone, skip, unskip } = useRunningPlan(user?.id)

  if (loading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  }
  if (error) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-600 dark:text-red-400">Couldn't load your plan: {error}</p>
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem className="flex flex-col gap-3">
          <RunningSubNav />
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Your fastest safe path to goal</h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {weeks.length} weeks, base through taper, ending with a 5k time trial. Pace targets adjust week to week as your uploads come in.
            </p>
          </div>
        </FadeInItem>

        {weeks.map((week) => {
          const weekRuns = runs.filter((r) => r.week_number === week.week_number)
          return (
            <FadeInItem key={week.week_number} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <h2 className="flex items-baseline gap-2 text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Week {week.week_number} &middot; {phaseLabel(week.phase)}
                  {week.is_deload && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-white/10 dark:text-zinc-400">deload</span>
                  )}
                  <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{totalWeekKm(weekRuns)}km total</span>
                </h2>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {formatDate(week.start_date)} &ndash; {formatDate(week.end_date)}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {weekRuns.map((run) => (
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
          )
        })}
      </FadeInStagger>
    </main>
  )
}
