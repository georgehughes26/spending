import { useState } from 'react'
import { motion } from 'framer-motion'
import { tapScale } from '../motion'
import { buildCheckIn } from '../../lib/habits/checkin'

export default function CheckInExportButton({ weekStart, settings, template, weekPlans, dailyLogsByDate, className = '' }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const text = open ? buildCheckIn({ weekStart, settings, template, weekPlans, dailyLogsByDate }) : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API can be unavailable (no HTTPS, permissions) -- the text
      // is still selectable in the box, so this isn't a dead end.
    }
  }

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ text }) } catch { /* user cancelled the share sheet */ }
    } else {
      copy()
    }
  }

  return (
    <>
      <motion.button
        {...tapScale}
        type="button"
        onClick={() => setOpen(true)}
        className={`min-h-11 cursor-pointer rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-pink-500 dark:bg-emerald-400 dark:text-zinc-950 dark:hover:bg-emerald-300 ${className}`}
      >
        Export check-in
      </motion.button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[85vh] w-full flex-col gap-3 rounded-t-2xl bg-white p-5 shadow-xl dark:bg-[var(--surface-dark)] sm:max-w-lg sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-medium uppercase tracking-wide text-pink-700 dark:text-emerald-400">Check-in for your coach</h2>
            <textarea
              readOnly
              value={text}
              className="min-h-64 flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-800 outline-none dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
              onFocus={(e) => e.target.select()}
            />
            <div className="flex gap-2">
              <motion.button {...tapScale} type="button" onClick={copy} className="min-h-11 flex-1 cursor-pointer rounded-xl bg-pink-600 text-sm font-semibold text-white dark:bg-emerald-400 dark:text-zinc-950">
                {copied ? 'Copied!' : 'Copy'}
              </motion.button>
              <motion.button {...tapScale} type="button" onClick={share} className="min-h-11 flex-1 cursor-pointer rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
                Share
              </motion.button>
              <motion.button {...tapScale} type="button" onClick={() => setOpen(false)} className="min-h-11 cursor-pointer rounded-xl px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Close
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
