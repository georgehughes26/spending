export function paceToString(secPerKm) {
  const sign = secPerKm < 0 ? '-' : ''
  const abs = Math.round(Math.abs(secPerKm))
  const min = Math.floor(abs / 60)
  const sec = abs % 60
  return `${sign}${min}:${sec.toString().padStart(2, '0')}/km`
}

export function durationToString(totalSec) {
  const abs = Math.round(Math.abs(totalSec))
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const s = abs % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function runTypeLabel(runType) {
  switch (runType) {
    case 'easy':
      return 'Long Run'
    case 'interval':
      return 'Interval'
    case 'tempo':
      return 'Tempo'
    case 'time_trial':
      return '5k Time Trial'
    default:
      return runType
  }
}

export function phaseLabel(phase) {
  switch (phase) {
    case 'base':
      return 'Base'
    case 'build1':
      return 'Build 1'
    case 'build2':
      return 'Build 2'
    case 'peak':
      return 'Peak'
    case 'taper':
      return 'Taper'
    case 'test':
      return 'Test'
    default:
      return phase
  }
}

export function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatPct(pct) {
  const sign = pct > 0 ? '+' : ''
  return `${sign}${(pct * 100).toFixed(1)}%`
}
