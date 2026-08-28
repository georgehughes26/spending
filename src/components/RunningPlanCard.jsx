import { useState } from 'react'
import { Link } from 'react-router-dom'
import RunningTypeBadge from './RunningTypeBadge'
import RunningVerdictBadge from './RunningVerdictBadge'
import RunningScoreBadge from './RunningScoreBadge'
import { CheckIcon, SkipIcon } from './RunningIcons'
import { paceToString } from '../lib/running/format'
import { prescriptionTargetDistanceKm } from '../lib/running/prescriptions'

function summaryLine(prescription) {
  switch (prescription.kind) {
    case 'easy':
    case 'time_trial':
      return `@ ${paceToString(prescription.targetPaceSecPerKm)}`
    case 'tempo':
      return `${prescription.coreKm}km core @ ${paceToString(prescription.targetPaceSecPerKm)}`
    case 'interval': {
      const rep = prescription.reps[0]
      return `${prescription.reps.length} × ${rep.distanceM}m @ ${paceToString(rep.targetPaceSecPerKm)}`
    }
    default:
      return ''
  }
}

export default function RunningPlanCard({ run, completedSummary, onMarkDone, onSkip, onUnskip }) {
  const prescription = run.prescription_json
  const isDone = run.status === 'completed'
  const isSkipped = run.status === 'skipped'
  const [busy, setBusy] = useState(false)
  const detailHref = isDone && completedSummary
    ? `/training/running/history/${completedSummary.completedRunId}`
    : `/training/running/runs/${run.id}`

  async function act(fn) {
    setBusy(true)
    try {
      await fn(run.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`rounded-xl border p-3 text-left shadow-sm ${
        isSkipped
          ? 'border-zinc-200 bg-zinc-50 opacity-60 dark:border-white/5 dark:bg-white/[0.02]'
          : 'border-zinc-200 bg-white dark:border-white/10 dark:bg-white/5'
      }`}
    >
      <Link to={detailHref} className="block">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <RunningTypeBadge runType={run.run_type} />
          <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">Week {run.week_number}</span>
        </div>

        <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{prescriptionTargetDistanceKm(prescription)}km</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{summaryLine(prescription)}</div>
      </Link>

      <div className="mt-2.5 border-t border-zinc-100 pt-2.5 dark:border-white/10">
        {isDone && completedSummary ? (
          <div className="flex items-center gap-2">
            <RunningVerdictBadge verdict={completedSummary.verdict} />
            <RunningScoreBadge score={completedSummary.rating} />
          </div>
        ) : isSkipped ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <SkipIcon className="h-3.5 w-3.5" />
              Skipped
            </span>
            {onUnskip && (
              <button type="button" disabled={busy} onClick={() => act(onUnskip)} className="text-xs font-medium text-pink-600 hover:underline disabled:opacity-40 dark:text-emerald-400">
                Undo
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {onMarkDone && (
              <button
                type="button"
                disabled={busy}
                onClick={() => act(onMarkDone)}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline disabled:opacity-40 dark:text-emerald-400"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                Mark done
              </button>
            )}
            {onSkip && (
              <button
                type="button"
                disabled={busy}
                onClick={() => act(onSkip)}
                className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:underline disabled:opacity-40 dark:text-zinc-400"
              >
                <SkipIcon className="h-3.5 w-3.5" />
                Skip
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
