import {
  EASY_END_KM,
  EASY_PACE_RATIO,
  EASY_START_KM,
  INTERVAL_SPEC_BY_PHASE,
  PLAN_GOAL_5K_SECONDS,
  TEMPO_CORE_END_KM,
  TEMPO_CORE_START_KM,
  TEMPO_PACE_RATIO,
  TEMPO_PAD_KM,
  TIME_TRIAL_DISTANCE_KM,
  DELOAD_VOLUME_FACTOR,
} from './constants'

function round1(n) {
  return Math.round(n * 10) / 10
}

function volumeFactor(ctx) {
  return ctx.isDeload ? DELOAD_VOLUME_FACTOR : 1
}

export function buildEasyPrescription(ctx, anchorPaceSecPerKm) {
  const distanceKm = (EASY_START_KM + (EASY_END_KM - EASY_START_KM) * ctx.progressFraction) * volumeFactor(ctx)
  return {
    kind: 'easy',
    distanceKm: round1(distanceKm),
    targetPaceSecPerKm: Math.round(anchorPaceSecPerKm * EASY_PACE_RATIO),
  }
}

export function buildTempoPrescription(ctx, anchorPaceSecPerKm) {
  const vf = volumeFactor(ctx)
  const coreKm = (TEMPO_CORE_START_KM + (TEMPO_CORE_END_KM - TEMPO_CORE_START_KM) * ctx.progressFraction) * vf
  // Deload is meant to be a pure volume reduction (see DELOAD_VOLUME_FACTOR),
  // so the padding scales down with it too, not just the core -- otherwise
  // the fixed padding stops shrinking exactly when everything else does,
  // eating into the long run's margin on the week it's most needed.
  const padKm = round1(TEMPO_PAD_KM * vf)
  return {
    kind: 'tempo',
    warmupKm: padKm,
    coreKm: round1(coreKm),
    targetPaceSecPerKm: Math.round(anchorPaceSecPerKm * TEMPO_PACE_RATIO),
    cooldownKm: padKm,
  }
}

export function buildIntervalPrescription(ctx, anchorPaceSecPerKm) {
  const spec = INTERVAL_SPEC_BY_PHASE[ctx.phase]
  const repCount = ctx.isDeload && spec.deloadReps ? spec.deloadReps : spec.reps
  const targetPaceSecPerKm = Math.round(anchorPaceSecPerKm * spec.paceRatio)
  const repDurationSec = (spec.repDistanceM / 1000) * targetPaceSecPerKm
  const recoverySec = Math.round(repDurationSec * spec.recoveryRatio)

  return {
    kind: 'interval',
    warmupKm: 1.5,
    reps: Array.from({ length: repCount }, () => ({
      distanceM: spec.repDistanceM,
      targetPaceSecPerKm,
      recoverySec,
    })),
    cooldownKm: 1.5,
  }
}

export function buildTimeTrialPrescription() {
  return {
    kind: 'time_trial',
    distanceKm: TIME_TRIAL_DISTANCE_KM,
    targetPaceSecPerKm: Math.round(PLAN_GOAL_5K_SECONDS / 5),
  }
}

export function prescriptionTargetDistanceKm(p) {
  switch (p.kind) {
    case 'easy':
      return p.distanceKm
    case 'tempo':
      return round1(p.warmupKm + p.coreKm + p.cooldownKm)
    case 'interval':
      return round1(p.warmupKm + p.cooldownKm + p.reps.reduce((s, r) => s + r.distanceM, 0) / 1000)
    case 'time_trial':
      return p.distanceKm
    default:
      return 0
  }
}

export function prescriptionTargetPaceSecPerKm(p) {
  switch (p.kind) {
    case 'easy':
    case 'tempo':
    case 'time_trial':
      return p.targetPaceSecPerKm
    case 'interval':
      return p.reps[0]?.targetPaceSecPerKm ?? 0
    default:
      return 0
  }
}
