import { groupReps } from '../lib/running/intervalGrouping'
import { durationToString, paceToString } from '../lib/running/format'
import { prescriptionTargetDistanceKm } from '../lib/running/prescriptions'

function IntervalRepsList({ reps }) {
  return (
    <ul className="flex flex-col gap-1">
      {groupReps(reps).map((g, i) => (
        <li key={i} className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{g.count}&times;{g.rep.distanceM}m</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            @ {paceToString(g.rep.targetPaceSecPerKm)} &middot; {durationToString(g.rep.recoverySec)} recovery
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Full prescription readout -- used on the run detail page and the full Plan page. */
export default function PrescriptionSummary({ prescription, size = 'sm' }) {
  const numSize = size === 'lg' ? 'text-4xl sm:text-5xl' : 'text-2xl'
  const totalKm = prescriptionTargetDistanceKm(prescription)

  switch (prescription.kind) {
    case 'easy':
      return (
        <div className="flex items-baseline gap-2">
          <span className={`font-bold leading-none text-zinc-900 dark:text-zinc-100 ${numSize}`}>{totalKm}</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">km @ {paceToString(prescription.targetPaceSecPerKm)}</span>
        </div>
      )
    case 'tempo':
      return (
        <div>
          <div className="flex items-baseline gap-2">
            <span className={`font-bold leading-none text-zinc-900 dark:text-zinc-100 ${numSize}`}>{totalKm}</span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">km total</span>
          </div>
          <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {prescription.warmupKm}km warmup, {prescription.coreKm}km tempo @ {paceToString(prescription.targetPaceSecPerKm)}, {prescription.cooldownKm}km cooldown
          </div>
        </div>
      )
    case 'time_trial':
      return (
        <div className="flex items-baseline gap-2">
          <span className={`font-bold leading-none text-zinc-900 dark:text-zinc-100 ${numSize}`}>{totalKm}</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">km race effort, target {paceToString(prescription.targetPaceSecPerKm)}</span>
        </div>
      )
    case 'interval':
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <span className={`font-bold leading-none text-zinc-900 dark:text-zinc-100 ${numSize}`}>{totalKm}</span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">km total</span>
          </div>
          <IntervalRepsList reps={prescription.reps} />
          <div className="text-xs text-zinc-400 dark:text-zinc-500">{prescription.warmupKm}km warmup / {prescription.cooldownKm}km cooldown, easy</div>
        </div>
      )
    default:
      return null
  }
}
