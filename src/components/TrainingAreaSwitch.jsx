import { NavLink } from 'react-router-dom'

const AREAS = [
  { to: '/training/running', label: 'Running' },
  { to: '/training/strength', label: 'Strength' },
]

const pillClass = ({ isActive }) =>
  `rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors duration-150 ${
    isActive
      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
      : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5'
  }`

// The top-level switcher between Training's two areas -- sits above each
// area's own sub-nav (RunningSubNav / StrengthSubNav) so it reads as one
// "Training" section with two modes, not two unrelated features.
export default function TrainingAreaSwitch() {
  return (
    <nav className="flex gap-1">
      {AREAS.map((area) => (
        <NavLink key={area.to} to={area.to} className={pillClass}>
          {area.label}
        </NavLink>
      ))}
    </nav>
  )
}
