import { groupReps } from '../lib/running/intervalGrouping'
import { durationToString, paceToString } from '../lib/running/format'
import { warmupCooldownHrRange, workHrRange } from '../lib/running/runGuidance'

function stepsForPrescription(prescription, runType, maxHrBpm) {
  const ease = warmupCooldownHrRange(maxHrBpm)
  const work = workHrRange(runType, maxHrBpm)

  switch (prescription.kind) {
    case 'easy':
      return [{ text: `Run ${prescription.distanceKm}km @ ${paceToString(prescription.targetPaceSecPerKm)}, steady effort throughout.`, hr: work }]
    case 'time_trial':
      return [{ text: `Run ${prescription.distanceKm}km at race effort, target ${paceToString(prescription.targetPaceSecPerKm)}.`, hr: work }]
    case 'tempo':
      return [
        { text: `Warm up ${prescription.warmupKm}km easy.`, hr: ease },
        { text: `${prescription.coreKm}km @ ${paceToString(prescription.targetPaceSecPerKm)} -- tempo effort.`, hr: work },
        { text: `Cool down ${prescription.cooldownKm}km easy.`, hr: ease },
      ]
    case 'interval': {
      const mainSet = groupReps(prescription.reps)
        .map((g) => `${g.count} × ${g.rep.distanceM}m @ ${paceToString(g.rep.targetPaceSecPerKm)}, ${durationToString(g.rep.recoverySec)} jog recovery between reps`)
        .join('; then ')
      return [
        { text: `Warm up ${prescription.warmupKm}km easy.`, hr: ease },
        { text: `Main set: ${mainSet}.`, hr: work },
        { text: `Cool down ${prescription.cooldownKm}km easy.`, hr: ease },
      ]
    }
    default:
      return []
  }
}

function HrTag({ hr }) {
  if (!hr) return null
  return <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-zinc-400 dark:text-zinc-500">{hr.lowBpm}&ndash;{hr.highBpm} bpm</span>
}

/** Ordered steps for a run, each with its own target heart-rate range (warm up / work / cool down get different zones). */
export default function RunSteps({ prescription, runType, maxHrBpm }) {
  const steps = stepsForPrescription(prescription, runType, maxHrBpm)
  if (steps.length === 0) return null

  if (steps.length === 1) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <span className="text-sm text-zinc-600 dark:text-zinc-300">{steps[0].text}</span>
        <HrTag hr={steps[0].hr} />
      </div>
    )
  }

  return (
    <ol className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start justify-between gap-3">
          <span className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-600 dark:bg-emerald-400 text-xs font-semibold text-white dark:text-zinc-950">
              {i + 1}
            </span>
            <span className="pt-0.5 text-sm text-zinc-600 dark:text-zinc-300">{step.text}</span>
          </span>
          <span className="pt-1">
            <HrTag hr={step.hr} />
          </span>
        </li>
      ))}
    </ol>
  )
}
