import { useState } from 'react'
import { motion } from 'framer-motion'
import { tapScale } from './motion'

const SHIPPING_COMPANIES = ['Evri', 'InPost', 'Royal Mail']

export default function SoldCaptureModal({ item, onCancel, onConfirm }) {
  const [soldPrice, setSoldPrice] = useState(item.target_price ?? item.cost_price ?? '')
  const [soldDate, setSoldDate] = useState(new Date().toISOString().slice(0, 10))
  const [shippingOut, setShippingOut] = useState('')

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
        <h3 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Sold it! 🎉</h3>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{item.name} — how much for?</p>
        <div className="mb-3 flex h-11 items-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3">
          <span className="text-zinc-500 dark:text-zinc-400">£</span>
          <input
            type="number"
            min="0"
            step="0.01"
            autoFocus
            value={soldPrice}
            onChange={(e) => setSoldPrice(e.target.value)}
            className="w-full bg-transparent px-1 text-sm text-zinc-900 dark:text-zinc-100 outline-none"
          />
        </div>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Sold date</span>
          <input
            type="date"
            value={soldDate}
            onChange={(e) => setSoldDate(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none"
          />
        </label>
        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Shipping out (optional)</span>
          <select
            value={shippingOut}
            onChange={(e) => setShippingOut(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none"
          >
            <option value="">—</option>
            {SHIPPING_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <motion.button
            {...tapScale}
            type="button"
            onClick={() => onConfirm(Number(soldPrice) || 0, soldDate, shippingOut)}
            className="min-h-11 flex-1 cursor-pointer rounded-lg bg-pink-600 dark:bg-emerald-400 text-sm font-medium text-white dark:text-zinc-950"
          >
            Confirm sale
          </motion.button>
          <motion.button {...tapScale} type="button" onClick={onCancel} className="min-h-11 cursor-pointer px-3 text-sm text-zinc-500 dark:text-zinc-400">
            Cancel
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
