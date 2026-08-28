import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import RunningTypeBadge from '../components/RunningTypeBadge'
import RunningVerdictBadge from '../components/RunningVerdictBadge'
import RunningScoreBadge from '../components/RunningScoreBadge'
import PrescriptionSummary from '../components/PrescriptionSummary'
import RunSteps from '../components/RunSteps'
import RunningSubNav from '../components/RunningSubNav'
import { CheckIcon, SkipIcon } from '../components/RunningIcons'
import { FadeInItem, FadeInStagger, tapScale } from '../components/motion'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useRunningPlan } from '../hooks/useRunningPlan'
import { useRunningProfile } from '../hooks/useRunningProfile'
import { phaseLabel } from '../lib/running/format'

export default function RunningRunDetailPage() {
  const { user } = useAuth()
  const { id } = useParams()
  const { weeks, runs, completedSummaries, loading: planLoading, error: planError, markDone, skip, unskip } = useRunningPlan(user?.id)
  const { profile, loading: profileLoading } = useRunningProfile(user?.id)
  const [busy, setBusy] = useState(false)

  if (planLoading || profileLoading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  }
  if (planError) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-600 dark:text-red-400">Couldn't load this run: {planError}</p>
  }

  const run = runs.find((r) => String(r.id) === id)
  if (!run) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Run not found.</p>
  }

  const completedSummary = completedSummaries[run.id]
  if (run.status === 'completed' && completedSummary) {
    return <Navigate to={`/training/running/history/${completedSummary.completedRunId}`} replace />
  }

  const week = weeks.find((w) => w.week_number === run.week_number)
  const prescription = run.prescription_json

  async function act(fn) {
    setBusy(true)
    try {
      await fn(run.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem>
          <RunningSubNav />
        </FadeInItem>

        <FadeInItem>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <RunningTypeBadge runType={run.run_type} />
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                Week {run.week_number} of {weeks.length} &middot; {phaseLabel(week?.phase ?? 'base')}
                {week?.is_deload ? ' · deload' : ''}
              </span>
            </div>

            <div className="mt-4">
              <PrescriptionSummary prescription={prescription} size="lg" />
            </div>

            {run.status === 'skipped' ? (
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-dashed border-zinc-200 pt-4 dark:border-white/10">
                <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  <SkipIcon className="h-4 w-4" />
                  Skipped
                </span>
                <motion.button
                  {...tapScale}
                  type="button"
                  disabled={busy}
                  onClick={() => act(unskip)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/5"
                >
                  {busy ? 'Restoring…' : 'Actually, put this back on the plan'}
                </motion.button>
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-dashed border-zinc-200 pt-4 dark:border-white/10">
                <motion.button
                  {...tapScale}
                  type="button"
                  disabled={busy}
                  onClick={() => act(markDone)}
                  className="flex items-center gap-1.5 rounded-lg bg-pink-600 dark:bg-emerald-400 px-4 py-2 text-sm font-medium text-white dark:text-zinc-950 disabled:opacity-40"
                >
                  <CheckIcon className="h-4 w-4" />
                  {busy ? 'Marking done…' : 'Mark done (no file)'}
                </motion.button>
                <motion.button
                  {...tapScale}
                  type="button"
                  disabled={busy}
                  onClick={() => act(skip)}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/5"
                >
                  <SkipIcon className="h-4 w-4" />
                  {busy ? 'Skipping…' : 'Skip this run'}
                </motion.button>
              </div>
            )}
          </div>
        </FadeInItem>

        <FadeInItem>
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-pink-700 dark:text-emerald-400">In order</h2>
          <RunSteps prescription={prescription} runType={run.run_type} maxHrBpm={profile?.observed_max_hr_bpm ?? null} />
          {!profile?.observed_max_hr_bpm && (
            <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
              Add your observed max heart rate in <Link to="/training/running/settings" className="underline">Settings</Link> to see a target zone for each step.
            </p>
          )}
        </FadeInItem>

        {run.status === 'upcoming' && (
          <FadeInItem>
            <Link
              to={`/training/running/upload?planned_run_id=${run.id}`}
              className="block rounded-lg border border-zinc-300 px-4 py-2.5 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/5"
            >
              Already ran it? Upload the file
            </Link>
          </FadeInItem>
        )}
      </FadeInStagger>
    </main>
  )
}
