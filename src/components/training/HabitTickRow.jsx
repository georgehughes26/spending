import { motion } from 'framer-motion'
import { tapScale } from '../motion'

// Full-row tap target (min 44px tall, the whole row is the hit area) --
// habits get ticked one-handed on a phone, not by aiming at a small box.
export default function HabitTickRow({ label, sublabel, done, onToggle, streak }) {
  return (
    <motion.button
      {...tapScale}
      type="button"
      onClick={onToggle}
      className={`flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-150 ${
        done
          ? 'border-pink-200 bg-pink-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
          : 'border-zinc-200 bg-white dark:border-white/10 dark:bg-white/5'
      }`}
    >
      <div className="min-w-0">
        <div className={`text-sm font-medium ${done ? 'text-pink-700 dark:text-emerald-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
          {label}
        </div>
        {sublabel && <div className="text-xs text-zinc-500 dark:text-zinc-400">{sublabel}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {streak > 1 && <span className="text-xs text-amber-600 dark:text-amber-400">🔥{streak}</span>}
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors duration-150 ${
            done
              ? 'border-pink-600 bg-pink-600 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-zinc-950'
              : 'border-zinc-300 dark:border-white/20'
          }`}
        >
          {done && (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 10.5l3 3 7-7.5" />
            </svg>
          )}
        </span>
      </div>
    </motion.button>
  )
}
