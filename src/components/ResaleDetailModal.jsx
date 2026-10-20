import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { tapScale } from './motion'
import { itemAllInCost, itemPotentialProfit, itemProfit } from '../data/deriveResale'
import { COLUMNS, itemColumn } from '../utils/resaleStages'
import { formatDDMM, formatGBP, formatMonthYear } from '../utils/format'

const STATUS_STYLES = {
  purchased: 'bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-300',
  listed: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  sold: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
}
const STATUS_LABELS = { purchased: 'Purchased', listed: 'Listed', sold: 'Sold' }
const SHIPPING_COMPANIES = ['Evri', 'InPost', 'Royal Mail']
const BOUGHT_FROM_OPTIONS = ['Vinted', 'eBay', 'Other']
const SOLD_ON_OPTIONS = ['Vinted', 'eBay', 'Website', 'Other']

const inputClass =
  'min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400'

export default function ResaleDetailModal({ item, onClose, onUpdate, onDelete, onMarkPaid, onMarkShipped, onMoveToStage }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [sku, setSku] = useState(item.sku ?? '')
  const [shippingIn, setShippingIn] = useState(item.shipping_in ?? '')
  const [shippingOut, setShippingOut] = useState(item.shipping_out ?? '')
  const [boughtFrom, setBoughtFrom] = useState(item.bought_from ?? '')
  const [costPrice, setCostPrice] = useState(item.cost_price)
  const [targetPrice, setTargetPrice] = useState(item.target_price ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [soldPrice, setSoldPrice] = useState(item.sold_price ?? '')
  const [soldDate, setSoldDate] = useState(item.sold_date ?? '')
  const [soldOn, setSoldOn] = useState(item.sold_on ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const allInCost = itemAllInCost(item)
  const profit = itemProfit(item)
  const potentialProfit = itemPotentialProfit(item)

  const run = async (fn) => {
    setSaving(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = () =>
    run(async () => {
      await onUpdate(item.id, {
        name,
        sku: sku.trim() || null,
        shipping_in: shippingIn || null,
        bought_from: boughtFrom || null,
        cost_price: Number(costPrice) || 0,
        target_price: targetPrice === '' ? null : Number(targetPrice),
        notes: notes.trim() || null,
        ...(item.status === 'sold'
          ? { sold_price: Number(soldPrice) || 0, sold_date: soldDate || null, shipping_out: shippingOut || null, sold_on: soldOn || null }
          : {}),
      })
      setEditing(false)
    })

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 dark:bg-[var(--surface-dark)] sm:rounded-2xl"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}>
                {STATUS_LABELS[item.status]}
              </span>
            </div>
            <motion.button {...tapScale} type="button" onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10" aria-label="Close">
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M5 5l10 10M15 5 5 15" /></svg>
            </motion.button>
          </div>

          {!editing && onMoveToStage && (
            <div className="mb-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Move to</div>
              <div className="flex flex-wrap gap-2">
                {COLUMNS.filter((col) => col.status !== itemColumn(item)).map((col) => (
                  <motion.button
                    key={col.status}
                    {...tapScale}
                    type="button"
                    onClick={() => onMoveToStage(item, col.status)}
                    className="min-h-11 cursor-pointer rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition-colors duration-150 hover:border-pink-400 hover:text-pink-700 dark:border-white/15 dark:text-zinc-300 dark:hover:border-emerald-400 dark:hover:text-emerald-400"
                  >
                    {col.label}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

          {editing ? (
            <div className="mb-4 flex flex-col gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" className={inputClass} />
              <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="# (optional)" className={inputClass} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Cost price</span>
                  <input type="number" min="0" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className={inputClass} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Target sell price</span>
                  <input type="number" min="0" step="0.01" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className={inputClass} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Shipping in</span>
                  <select value={shippingIn} onChange={(e) => setShippingIn(e.target.value)} className={inputClass}>
                    <option value="">—</option>
                    {SHIPPING_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Bought from</span>
                  <select value={boughtFrom} onChange={(e) => setBoughtFrom(e.target.value)} className={inputClass}>
                    <option value="">—</option>
                    {BOUGHT_FROM_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
                {item.status === 'sold' && (
                  <>
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Sold price</span>
                      <input type="number" min="0" step="0.01" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} className={inputClass} />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Sold date</span>
                      <input type="date" value={soldDate} onChange={(e) => setSoldDate(e.target.value)} className={inputClass} />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Sold on</span>
                      <select value={soldOn} onChange={(e) => setSoldOn(e.target.value)} className={inputClass}>
                        <option value="">—</option>
                        {SOLD_ON_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Shipping out</span>
                      <select value={shippingOut} onChange={(e) => setShippingOut(e.target.value)} className={inputClass}>
                        <option value="">—</option>
                        {SHIPPING_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                  </>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                rows={2}
                className="w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400"
              />
              <div className="flex items-center gap-3">
                <motion.button {...tapScale} type="button" onClick={handleSaveEdit} disabled={saving} className="min-h-11 cursor-pointer rounded-lg bg-pink-600 dark:bg-emerald-400 px-4 text-sm font-medium text-white dark:text-zinc-950 disabled:opacity-50">
                  Save
                </motion.button>
                <motion.button {...tapScale} type="button" onClick={() => setEditing(false)} className="min-h-11 cursor-pointer px-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Cancel
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Cost price</div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{formatGBP(item.cost_price, { pence: true })}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Target price</div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.target_price != null ? formatGBP(item.target_price, { pence: true }) : '—'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Sold price</div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.sold_price != null ? formatGBP(item.sold_price, { pence: true }) : '—'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">All-in cost</div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{formatGBP(allInCost, { pence: true })}</div>
              </div>
              {item.bought_from && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Bought from</div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.bought_from}</div>
                </div>
              )}
              {item.sold_on && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Sold on</div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.sold_on}</div>
                </div>
              )}
              {item.shipping_in && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Shipping in</div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.shipping_in}</div>
                </div>
              )}
              {item.shipping_out && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Shipping out</div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.shipping_out}</div>
                </div>
              )}
              {(profit != null || potentialProfit != null) && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{profit != null ? 'Profit' : 'Est. profit'}</div>
                  <div className={`font-medium ${(profit ?? potentialProfit) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatGBP(profit ?? potentialProfit, { pence: true, showSign: true })}
                  </div>
                </div>
              )}
              {item.notes && <div className="col-span-2 text-xs text-zinc-500 dark:text-zinc-400 sm:col-span-4">{item.notes}</div>}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 dark:border-white/10 pt-3">
            {item.status === 'sold' && item.payment_status !== 'paid' && (
              <motion.button {...tapScale} type="button" onClick={() => run(() => onMarkPaid(item.id))} disabled={saving} className="min-h-11 cursor-pointer rounded-lg bg-pink-600 dark:bg-emerald-400 px-4 text-sm font-medium text-white dark:text-zinc-950 disabled:opacity-50">
                Mark paid
              </motion.button>
            )}
            {item.status === 'sold' && item.shipping_status !== 'shipped' && (
              <motion.button {...tapScale} type="button" onClick={() => run(() => onMarkShipped(item.id))} disabled={saving} className="min-h-11 cursor-pointer rounded-lg border border-pink-300 dark:border-emerald-500/40 px-4 text-sm font-medium text-pink-700 dark:text-emerald-400 disabled:opacity-50">
                Mark shipped
              </motion.button>
            )}
            {item.status === 'sold' && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Sold {item.sold_date ? formatMonthYear(item.sold_date) : ''}
              </span>
            )}
            {!editing && (
              <motion.button {...tapScale} type="button" onClick={() => setEditing(true)} className="min-h-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-pink-700 dark:text-emerald-400">
                Edit
              </motion.button>
            )}
            <motion.button
              {...tapScale}
              type="button"
              onClick={() => {
                if (window.confirm(`Delete "${item.name}"? This can't be undone.`)) {
                  onDelete(item.id)
                  onClose()
                }
              }}
              className="min-h-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-red-600 dark:text-red-400"
            >
              Delete
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
