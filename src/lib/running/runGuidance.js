function hrRange(pctRange, maxHrBpm) {
  if (maxHrBpm === null) return null
  const [lowPct, highPct] = pctRange
  return {
    lowBpm: Math.round(maxHrBpm * lowPct),
    highBpm: Math.round(maxHrBpm * highPct),
    lowPct: Math.round(lowPct * 100),
    highPct: Math.round(highPct * 100),
  }
}

/** Easy jogging effort — used for warmups and cooldowns regardless of the session's main effort. */
const EASE_HR_PCT = [0.6, 0.7]

/** [low, high] fraction of max HR for the work portion of each run type. */
const WORK_HR_PCT_BY_RUN_TYPE = {
  easy: [0.65, 0.75],
  tempo: [0.8, 0.88],
  interval: [0.85, 0.95],
  time_trial: [0.9, 1.0],
}

export function warmupCooldownHrRange(maxHrBpm) {
  return hrRange(EASE_HR_PCT, maxHrBpm)
}

export function workHrRange(runType, maxHrBpm) {
  return hrRange(WORK_HR_PCT_BY_RUN_TYPE[runType], maxHrBpm)
}
