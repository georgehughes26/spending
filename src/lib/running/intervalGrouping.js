/** Groups consecutive identical reps (the common case) into one summary line each. */
export function groupReps(reps) {
  const groups = []
  for (const rep of reps) {
    const last = groups[groups.length - 1]
    if (last && last.rep.distanceM === rep.distanceM && last.rep.targetPaceSecPerKm === rep.targetPaceSecPerKm && last.rep.recoverySec === rep.recoverySec) {
      last.count++
    } else {
      groups.push({ rep, count: 1 })
    }
  }
  return groups
}
