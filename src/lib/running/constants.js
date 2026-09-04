export const PLAN_START_5K_SECONDS = 1800 // 30:00 — default starting fitness for a brand-new profile
export const PLAN_GOAL_5K_SECONDS = 1499 // 24:59 — sub-25:00
export const MAX_WEEKLY_PACE_CHANGE = 0.015 // safety cap: at most 1.5% relative pace improvement per week

// Plan length is derived from the athlete's actual fitness gap (see
// curve.js's computePlanLength), not a fixed calendar date. These bound it:
// a floor so base->build->peak->taper adaptation has genuine time to happen
// even when the pace gap alone would allow a much shorter block, and a
// defensive ceiling against pathological inputs.
export const PLAN_LENGTH_FLOOR_WEEKS = 8
export const PLAN_LENGTH_CEILING_WEEKS = 24

// Front-loaded curve: the closer to the old PB (genuinely regaining lost
// fitness), the bigger the weekly steps; the closer to a brand-new PB, the
// smaller — hardest gains get the smallest steps. These cumulative targets
// are fixed regardless of how many weeks each phase spans (see
// curve.js's buildPhaseTable) — they encode the shape, not a week count.
export const PHASE_END_FRACTIONS = {
  base: 0.25,
  build1: 0.55,
  build2: 0.8,
  peak: 0.97,
  taper: 0.97,
  test: 0.97,
}

// Relative share of the "development" weeks (everything except the fixed
// 1-week taper and 1-week test/time-trial) each phase gets, apportioned by
// largest-remainder for whatever total plan length is computed.
export const DEVELOPMENT_PHASE_WEIGHTS = {
  base: 4,
  build1: 4,
  build2: 4,
  peak: 3,
}

// Deload = pure volume reduction; pace never regresses on a deload week.
export const DELOAD_VOLUME_FACTOR = 0.75

export const INTERVAL_SPEC_BY_PHASE = {
  base: { repDistanceM: 400, paceRatio: 0.93, recoveryRatio: 1.0, reps: 5, deloadReps: 4 },
  build1: { repDistanceM: 550, paceRatio: 0.95, recoveryRatio: 0.85, reps: 5, deloadReps: 4 },
  build2: { repDistanceM: 800, paceRatio: 0.97, recoveryRatio: 0.6, reps: 4, deloadReps: 3 },
  peak: { repDistanceM: 1200, paceRatio: 1.0, recoveryRatio: 0.5, reps: 3 },
  taper: { repDistanceM: 250, paceRatio: 0.9, recoveryRatio: 1.75, reps: 6 },
  test: { repDistanceM: 200, paceRatio: 0.9, recoveryRatio: 1.5, reps: 4 },
}

// Sized to stay the longest run of the week at every point in the plan --
// tempo's core grows at the same rate as this range but always adds a
// further TEMPO_PAD_KM*2 of fixed warmup/cooldown on top, so the long run
// needs a real head start (not just matching the core-vs-core numbers) to
// come out ahead once tempo's padding is counted. Confirmed against a real
// generated plan and against the worst case (a deload week, where the
// fixed-ish padding eats further into the gap): this margin holds up in
// both. See buildTempoPrescription for the other half of this fix (deload
// now scales tempo's padding down too, not just its core).
export const EASY_START_KM = 7.0
export const EASY_END_KM = 10.5
// 18% slower than current 5k pace: a real long run, not a junk-mileage
// recovery jog. With only 3 running days/week there's no volume to spare on
// a throwaway session (the FIRST/Furman "3plus2" methodology's rationale for
// running its long run notably faster than typical easy-day guidance) — and
// it needs to stay clearly slower than the tempo day's 1.12x to remain a
// physiologically distinct stimulus, not a longer version of the same run.
export const EASY_PACE_RATIO = 1.18

export const TEMPO_CORE_START_KM = 3.0
export const TEMPO_CORE_END_KM = 6.5
export const TEMPO_PAD_KM = 1.5 // warmup and cooldown, each
export const TEMPO_PACE_RATIO = 1.12

export const TIME_TRIAL_DISTANCE_KM = 5

// Fitness EMA (global trajectory update) — how strongly each run type's
// demonstrated pace moves the "current fitness" estimate. Time trial is a
// direct race-effort test at the goal distance, so it moves the needle hard.
export const FITNESS_EMA_ALPHA = {
  easy: 0.1,
  tempo: 0.3,
  interval: 0.35,
  time_trial: 0.7,
}
export const FITNESS_UPDATE_CLAMP = 0.04 // max fractional change to the fitness estimate from one run
export const PLAUSIBLE_5K_PACE_RANGE_SEC = [150, 900]

// Verdict thresholds
export const ON_TRACK_BAND = 0.03
export const BEHIND_THRESHOLD = 0.04
export const AHEAD_THRESHOLD_WITH_HR = 0.04
export const AHEAD_THRESHOLD_NO_HR = 0.06
export const HR_ROOM_TO_PUSH_FACTOR = 0.9 // work-effort HR below 90% of observed max => room to push
export const FADE_THRESHOLD = 0.05 // 2nd-half reps this much slower than 1st-half => "faded"

// Local next-occurrence nudges (orthogonal to the global trajectory)
export const LOCAL_INTERVAL_PACE_NUDGE = 0.02
export const LOCAL_TEMPO_DISTANCE_STEP_KM = 0.75
export const LOCAL_TEMPO_CORE_MIN_KM = 2.0
export const LOCAL_EASY_DISTANCE_STEP_UP_KM = 1.0
export const LOCAL_EASY_DISTANCE_STEP_DOWN_KM = 0.75
export const LOCAL_EASY_DISTANCE_MIN_KM = 4.0
export const EASY_COMFORT_DISTANCE_RATIO = 1.3 // covered >=130% of prescribed distance comfortably
