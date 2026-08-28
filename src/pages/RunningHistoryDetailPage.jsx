import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Card from '../components/Card'
import RunningTypeBadge from '../components/RunningTypeBadge'
import RunningVerdictBadge from '../components/RunningVerdictBadge'
import RunningScoreBadge from '../components/RunningScoreBadge'
import RunningSubNav from '../components/RunningSubNav'
import { FadeInItem, FadeInStagger, tapScale } from '../components/motion'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useRunningCompletedRuns } from '../hooks/useRunningCompletedRuns'
import * as db from '../lib/running/db'
import { computeRatingBreakdown, deriveExecutionFlags } from '../lib/running/analysis'
import { paceToString, durationToString, formatDate, formatPct } from '../lib/running/format'

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-xs text-zinc-400 dark:text-zinc-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  )
}

function ScoreBreakdown({ breakdown }) {
  return (
    <Card title="Score breakdown">
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Pace margin vs target ({formatPct(breakdown.performanceVsTargetPct)})</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{breakdown.afterPaceMargin}</span>
        </div>
        {breakdown.faded && (
          <div className="flex justify-between text-amber-600 dark:text-amber-400">
            <span>Faded late in the run</span>
            <span>-15</span>
          </div>
        )}
        {breakdown.shortfall && (
          <div className="flex justify-between text-amber-600 dark:text-amber-400">
            <span>Fell short of the prescription</span>
            <span>-20</span>
          </div>
        )}
        <div className="mt-1 flex justify-between border-t border-zinc-200 pt-2 font-semibold dark:border-white/10">
          <span className="text-zinc-900 dark:text-zinc-100">Final score</span>
          <span className="text-zinc-900 dark:text-zinc-100">{breakdown.final}/100</span>
        </div>
      </div>
    </Card>
  )
}

function SplitsTable({ splits }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-zinc-400 dark:text-zinc-500">
            <th className="pb-2 font-medium">Km</th>
            <th className="pb-2 font-medium">Split</th>
            <th className="pb-2 font-medium">Pace</th>
          </tr>
        </thead>
        <tbody>
          {splits.map((s, i) => (
            <tr key={i} className="border-t border-zinc-100 dark:border-white/5">
              <td className="py-1.5 text-zinc-900 dark:text-zinc-100">{s.km.toFixed(2)}</td>
              <td className="py-1.5 text-zinc-500 dark:text-zinc-400">{durationToString(s.splitSec)}</td>
              <td className="py-1.5 text-zinc-500 dark:text-zinc-400">{paceToString(s.paceSecPerKm)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function RunningHistoryDetailPage() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const { deleteRun } = useRunningCompletedRuns(user?.id)

  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setLoading(true)
    db.getCompletedRunById(user.id, Number(id))
      .then((r) => { if (!cancelled) setRun(r) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id, id])

  async function handleDelete() {
    if (!run || !window.confirm('Delete this run? Its planned slot will become upcoming again.')) return
    setDeleting(true)
    try {
      await deleteRun(run.id)
      navigate('/running/history')
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  if (loading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  }
  if (error || !run) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-600 dark:text-red-400">{error ?? 'Run not found.'}</p>
  }

  const splits = JSON.parse(run.splits_json)
  const prescription = JSON.parse(run.prescription_json)
  const analysis = run.analysis_json ? JSON.parse(run.analysis_json) : {}
  const { faded, shortfall } = deriveExecutionFlags(
    prescription,
    run.distance_km,
    run.target_distance_km,
    analysis.fadePct ?? null,
    analysis.detectedReps?.length ?? null,
  )
  const scoreBreakdown = run.verdict ? computeRatingBreakdown(run.verdict, run.performance_vs_target_pct, faded, shortfall) : null

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem>
          <RunningSubNav />
        </FadeInItem>

        <FadeInItem>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <RunningTypeBadge runType={run.run_type} />
                <RunningVerdictBadge verdict={run.verdict} />
                <RunningScoreBadge score={run.rating} />
              </div>
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

            <h1 className="mt-3 text-xl font-bold text-zinc-900 dark:text-zinc-100">{formatDate(run.run_date)}</h1>

            {run.excluded_from_fitness && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                This run's pace looked implausible and was excluded from your fitness calculation.
              </div>
            )}

            {analysis.reasoning?.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                {analysis.reasoning.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Distance" value={`${run.distance_km.toFixed(2)}km`} />
              <Stat label="Duration" value={durationToString(run.duration_sec)} />
              <Stat label="Avg pace" value={paceToString(run.avg_pace_sec_per_km)} />
              <Stat label="vs target" value={formatPct(run.performance_vs_target_pct)} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label="Target"
                value={`${run.target_distance_km}km${run.target_pace_sec_per_km ? ` @ ${paceToString(run.target_pace_sec_per_km)}` : ''}`}
              />
              {run.avg_heart_rate_bpm != null && <Stat label="Avg HR" value={`${run.avg_heart_rate_bpm} bpm`} />}
              {run.max_heart_rate_bpm != null && <Stat label="Max HR" value={`${run.max_heart_rate_bpm} bpm`} />}
              {run.elevation_gain_m != null && <Stat label="Elevation gain" value={`${Math.round(run.elevation_gain_m)}m`} />}
            </div>
          </Card>
        </FadeInItem>

        {scoreBreakdown && <FadeInItem><ScoreBreakdown breakdown={scoreBreakdown} /></FadeInItem>}

        <FadeInItem>
          <Card title="Splits">
            <SplitsTable splits={splits} />
          </Card>
        </FadeInItem>
      </FadeInStagger>
    </main>
  )
}
