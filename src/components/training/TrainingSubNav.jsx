import { NavLink } from 'react-router-dom'

const tabClass = ({ isActive }) =>
  `min-h-10 flex-1 cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors duration-150 ${
    isActive
      ? 'bg-pink-600 text-white dark:bg-emerald-400 dark:text-zinc-950'
      : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10'
  }`

export default function TrainingSubNav() {
  return (
    <nav className="mb-5 flex gap-1.5 rounded-xl bg-zinc-100 p-1 dark:bg-white/5">
      <NavLink to="/training" end className={tabClass}>Today</NavLink>
      <NavLink to="/training/week" className={tabClass}>Week</NavLink>
      <NavLink to="/training/settings" className={tabClass}>Settings</NavLink>
    </nav>
  )
}
