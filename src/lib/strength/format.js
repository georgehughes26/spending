function ordinal(n) {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`
}

/** "WC 20th August" -- the Monday a program week starts. */
export function weekCommencingLabel(startDateIso) {
  const d = new Date(`${startDateIso}T00:00:00`)
  const month = d.toLocaleDateString('en-GB', { month: 'long' })
  return `WC ${ordinal(d.getDate())} ${month}`
}
