import { NavLink } from 'react-router-dom'
import TrainingAreaSwitch from './TrainingAreaSwitch'

const TABS = [
  { to: '/training/running', label: 'Dashboard', end: true },
  { to: '/training/running/upload', label: 'Upload' },
  { to: '/training/running/history', label: 'History' },
  { to: '/training/running/settings', label: 'Settings' },
]

const tabClass = ({ isActive }) =>
  `rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
    isActive
      ? 'bg-pink-600 dark:bg-emerald-400 text-white dark:text-zinc-950'
      : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5'
  }`

export default function RunningSubNav() {
  return (
    <div className="flex flex-col gap-2.5">
      <TrainingAreaSwitch />
      <nav className="flex flex-wrap gap-1.5">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={tabClass}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
