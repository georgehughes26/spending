import { useState } from 'react'
import { motion } from 'framer-motion'
import { tapScale } from './motion'

// Captures the date an item actually completed (paid + shipped, fully
// wrapped up) -- stored in sold_date, which now means "completed date"
// rather than "the day it was marked sold".
export default function CompleteCaptureModal({ item, onCancel, onConfirm }) {
  const [completedDate, setCompletedDate] = useState(item.sold_date || new Date().toISOString().slice(0, 10))

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 dark:bg-[var(--surface-dark)] sm:rounded-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">All done!</h3>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{item.name} — when did it complete?</p>
        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Completed date</span>
          <input
            type="date"
            autoFocus
            value={completedDate}
            onChange={(e) => setCompletedDate(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none"
          />
        </label>
        <div className="flex items-center gap-3">
          <motion.button
            {...tapScale}
            type="button"
            onClick={() => onConfirm(completedDate)}
            className="min-h-11 flex-1 cursor-pointer rounded-lg bg-pink-600 dark:bg-emerald-400 text-sm font-medium text-white dark:text-zinc-950"
          >
            Mark completed
          </motion.button>
          <motion.button {...tapScale} type="button" onClick={onCancel} className="min-h-11 cursor-pointer px-3 text-sm text-zinc-500 dark:text-zinc-400">
            Cancel
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
