import { useState } from 'react'
import { formatGBP, formatMonthYear } from '../utils/format'
import { motion } from 'framer-motion'
import { tapScale } from './motion'

export default function PotRow({ pot, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(pot.name)
  const [percentage, setPercentage] = useState(Math.round(pot.percentage * 100))
  const [startingBalance, setStartingBalance] = useState(pot.starting_balance)
  const [target, setTarget] = useState(pot.target ?? '')
  const [targetDate, setTargetDate] = useState(pot.target_date ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdate(pot.id, {
        name,
        percentage: (Number(percentage) || 0) / 100,
        startingBalance: Number(startingBalance) || 0,
        target: target === '' ? null : Number(target),
        targetDate: targetDate || null,
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <li className="py-3">
        <div className="mb-3 flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500 dark:text-zinc-400">% of leftover</span>
            <div className="flex min-h-11 items-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3">
              <input
                type="number"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="w-full bg-transparent text-zinc-900 dark:text-zinc-100 outline-none"
              />
              <span className="text-zinc-500 dark:text-zinc-400">%</span>
            </div>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Starting balance</span>
            <div className="flex min-h-11 items-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3">
              <span className="text-zinc-500 dark:text-zinc-400">£</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                className="w-full bg-transparent px-1 text-zinc-900 dark:text-zinc-100 outline-none"
              />
            </div>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Target (optional)</span>
            <div className="flex min-h-11 items-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3">
              <span className="text-zinc-500 dark:text-zinc-400">£</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full bg-transparent px-1 text-zinc-900 dark:text-zinc-100 outline-none"
              />
            </div>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Target date (optional)</span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <motion.button {...tapScale}
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="min-h-11 cursor-pointer rounded-lg bg-pink-600 dark:bg-emerald-400 px-4 text-sm font-medium text-white dark:text-zinc-950 transition-colors duration-150 hover:bg-pink-500 dark:hover:bg-emerald-300 disabled:opacity-50"
          >
            Save
          </motion.button>
          <motion.button {...tapScale}
            type="button"
            onClick={() => setEditing(false)}
            className="min-h-11 cursor-pointer px-2 text-sm text-zinc-500 dark:text-zinc-400 transition-colors duration-150 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            Cancel
          </motion.button>
        </div>
      </li>
    )
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 text-sm">
      <div>
        <span className="text-zinc-800 dark:text-zinc-200">{pot.name}</span>{' '}
        <span className="text-xs text-zinc-500 dark:text-zinc-400">({Math.round(pot.percentage * 100)}%)</span>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatGBP(pot.starting_balance)} starting
          {pot.target ? ` · target ${formatGBP(pot.target)}` : ''}
          {pot.target_date ? ` by ${formatMonthYear(pot.target_date)}` : ''}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <motion.button {...tapScale}
          type="button"
          onClick={() => setEditing(true)}
          className="min-h-11 min-w-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-pink-600 dark:text-emerald-400 transition-colors duration-150 hover:bg-pink-100 dark:hover:bg-emerald-500/10 hover:text-pink-700 dark:hover:text-emerald-400"
        >
          Edit
        </motion.button>
        <motion.button {...tapScale}
          type="button"
          onClick={() => onDelete(pot.id)}
          className="min-h-11 min-w-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-red-600 dark:text-red-400 transition-colors duration-150 hover:bg-red-100 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
        >
          Delete
        </motion.button>
      </div>
    </li>
  )
}
