import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Card from '../components/Card'
import ResaleBoard from '../components/ResaleBoard'
import MobileResaleBoard from '../components/MobileResaleBoard'
import ResaleTimeSeriesChart from '../components/ResaleTimeSeriesChart'
import ResaleLogisticsCard from '../components/ResaleLogisticsCard'
import ResaleLogCard from '../components/ResaleLogCard'
import ResaleCostsCard from '../components/ResaleCostsCard'
import { AnimatedNumber, tapScale } from '../components/motion'
import { useAuth } from '../context/AuthContext'
import { useResaleItems } from '../hooks/useResaleItems'
import { useResaleGeneralCosts } from '../hooks/useResaleGeneralCosts'
import { useResaleLog } from '../hooks/useResaleLog'
import { deriveResaleLogistics, deriveResaleSummary, deriveResaleTimeSeries } from '../data/deriveResale'
import { exportResaleToExcel } from '../utils/resaleExport'
import { HOURS_LOG, MILEAGE_LOG } from '../utils/resaleLogs'
import { formatGBP } from '../utils/format'

const inputClass =
  'min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400'

const BOUGHT_FROM_OPTIONS = ['Vinted', 'eBay', 'Other']

function emptyForm() {
  return { name: '', boughtFrom: '', costPrice: '', targetPrice: '', purchasedDate: new Date().toISOString().slice(0, 10) }
}

// Parcel numbers are auto-generated, not typed in -- the next one is always
// one higher than the highest number handed out so far, so deleting an item
// never causes a later item to reuse its number.
function nextParcelNumber(items) {
  const highest = items.reduce((max, item) => {
    const n = Number.parseInt(item.sku, 10)
    return Number.isFinite(n) && n > max ? n : max
  }, 0)
  return highest + 1
}

function AddItemForm({ items, onAdd, onClose }) {
  const [form, setForm] = useState(emptyForm())
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)
  const parcelNumber = nextParcelNumber(items)

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setAdding(true)
    setError(null)
    try {
      await onAdd({
        name: form.name.trim(),
        sku: String(parcelNumber),
        bought_from: form.boughtFrom || null,
        cost_price: Number(form.costPrice) || 0,
        target_price: form.targetPrice === '' ? null : Number(form.targetPrice),
        purchased_date: form.purchasedDate,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input autoFocus value={form.name} onChange={set('name')} placeholder="Item name" className={inputClass} />
        <div className="flex h-11 items-center rounded-lg border border-dashed border-zinc-300 dark:border-white/15 px-3 text-sm text-zinc-500 dark:text-zinc-400">
          #{parcelNumber} <span className="ml-1 text-xs">(auto)</span>
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Purchased date</span>
          <input type="date" value={form.purchasedDate} onChange={set('purchasedDate')} className={inputClass} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Bought from (optional)</span>
          <select value={form.boughtFrom} onChange={set('boughtFrom')} className={inputClass}>
            <option value="">—</option>
            {BOUGHT_FROM_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Cost price</span>
          <div className="flex h-11 items-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3">
            <span className="text-zinc-500 dark:text-zinc-400">£</span>
            <input type="number" min="0" step="0.01" value={form.costPrice} onChange={set('costPrice')} className="w-full bg-transparent px-1 text-zinc-900 dark:text-zinc-100 outline-none" />
          </div>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Target sell price (optional)</span>
          <div className="flex h-11 items-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3">
            <span className="text-zinc-500 dark:text-zinc-400">£</span>
            <input type="number" min="0" step="0.01" value={form.targetPrice} onChange={set('targetPrice')} className="w-full bg-transparent px-1 text-zinc-900 dark:text-zinc-100 outline-none" />
          </div>
        </label>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
        <motion.button
          {...tapScale}
          type="submit"
          disabled={adding || !form.name.trim()}
          className="min-h-11 flex-1 cursor-pointer rounded-lg bg-pink-600 dark:bg-emerald-400 text-sm font-medium text-white dark:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-6"
        >
          {adding ? 'Adding…' : 'Add to stock'}
        </motion.button>
        <motion.button {...tapScale} type="button" onClick={onClose} className="min-h-11 cursor-pointer px-3 text-sm text-zinc-500 dark:text-zinc-400">
          Cancel
        </motion.button>
      </div>
    </form>
  )
}

function AddItemModal({ items, onAdd, onClose }) {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg rounded-t-2xl bg-white p-5 dark:bg-[var(--surface-dark)] sm:rounded-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Add stock</h3>
        <AddItemForm items={items} onAdd={onAdd} onClose={onClose} />
      </motion.div>
    </motion.div>
  )
}

function PerformanceHero({ summary }) {
  return (
    <Card
      title="Performance"
      className="!border-0 bg-gradient-to-br from-pink-600 to-rose-600 dark:from-emerald-500 dark:to-teal-600 !shadow-[0_16px_40px_-12px_rgba(219,39,119,0.45)] dark:!shadow-[0_16px_40px_-12px_rgba(16,185,129,0.35)]"
      titleClassName="!text-pink-100 dark:!text-emerald-50"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-white/80">Gross profit</div>
            <AnimatedNumber value={summary.grossProfit} format="gbp" showSign className="block text-4xl font-bold tracking-tight tabular-nums text-white sm:text-5xl" />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-white/80">Net profit</div>
            <AnimatedNumber value={summary.netProfit} format="gbp" showSign className="block text-4xl font-bold tracking-tight tabular-nums text-white sm:text-5xl" />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-right">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-white/80">Sales</div>
            <div className="text-lg font-semibold text-white">{formatGBP(summary.totalSales, { pence: true })}</div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-white/80">Costs</div>
            <div className="text-lg font-semibold text-white">{formatGBP(summary.totalCost, { pence: true })}</div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-white/80">Overheads</div>
            <div className="text-lg font-semibold text-white">{formatGBP(summary.totalExpenses, { pence: true })}</div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-white/80">Pending</div>
            <div className="text-lg font-semibold text-white">{formatGBP(summary.pendingProfit, { pence: true, showSign: true })}</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function ResalePage() {
  const { user } = useAuth()
  const {
    items,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    markSold,
  } = useResaleItems(user?.id)
  const { costs: allGeneralCosts, addCost: addGeneralCost, updateCost: updateGeneralCost, deleteCost: deleteGeneralCost } = useResaleGeneralCosts(user?.id)
  const generalCosts = useMemo(() => allGeneralCosts.filter((c) => c.kind !== 'expense'), [allGeneralCosts])
  const generalExpenses = useMemo(() => allGeneralCosts.filter((c) => c.kind === 'expense'), [allGeneralCosts])
  const mileageLog = useResaleLog(user?.id, MILEAGE_LOG.table, MILEAGE_LOG.dateField)
  const hoursLog = useResaleLog(user?.id, HOURS_LOG.table, HOURS_LOG.dateField)
  const mileage = mileageLog.entries
  const hours = hoursLog.entries
  const [granularity, setGranularity] = useState('week')
  const [addingItem, setAddingItem] = useState(false)
  // Per-device display preference, not real data -- fine to lose on a
  // cleared browser, so localStorage (not a DB column) is enough.
  const [hideCompleted, setHideCompleted] = useState(() => {
    try {
      return localStorage.getItem('resale_hide_completed') === '1'
    } catch {
      return false
    }
  })
  const toggleHideCompleted = () => {
    setHideCompleted((prev) => {
      const next = !prev
      try {
        localStorage.setItem('resale_hide_completed', next ? '1' : '0')
      } catch {}
      return next
    })
  }

  const summary = useMemo(
    () => deriveResaleSummary(items, generalCosts, generalExpenses, mileage),
    [items, generalCosts, generalExpenses, mileage],
  )
  const timeSeries = useMemo(() => deriveResaleTimeSeries(items, generalCosts, granularity), [items, generalCosts, granularity])
  const logistics = useMemo(() => deriveResaleLogistics(items, generalCosts), [items, generalCosts])
  const initialLoading = loading && items.length === 0

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Reselling</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Track stock from purchase through to payout, and see how you're performing.
          </p>
        </div>
        <motion.button
          {...tapScale}
          type="button"
          onClick={() => exportResaleToExcel({ items, directCosts: generalCosts, overheads: generalExpenses, mileage, hours })}
          disabled={items.length === 0 && allGeneralCosts.length === 0 && mileage.length === 0 && hours.length === 0}
          className="min-h-11 cursor-pointer rounded-lg border border-zinc-300 dark:border-white/15 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
        >
          Export to Excel
        </motion.button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-300 dark:border-red-500/30 bg-red-100 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Couldn't load your stock: {error}
        </p>
      )}

      {initialLoading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading your stock…</p>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-5">
            <PerformanceHero summary={summary} />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ResaleTimeSeriesChart data={timeSeries} granularity={granularity} onGranularityChange={setGranularity} />
              </div>
              <ResaleLogisticsCard logistics={logistics} />
            </div>
          </div>

          {items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/15 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No stock added yet. Tap the + button to add your first item.
            </p>
          ) : (
            <>
              {/* Drag-and-drop kanban on desktop, where there's room and a
                  mouse; tap-to-filter + tap-to-move list on mobile, where
                  dragging between narrow columns is too fiddly. */}
              <div className="hidden lg:block">
                <ResaleBoard
                  items={items}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                  onMarkSold={markSold}
                  hideCompleted={hideCompleted}
                  onToggleHideCompleted={toggleHideCompleted}
                />
              </div>
              <div className="lg:hidden">
                <MobileResaleBoard
                  items={items}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                  onMarkSold={markSold}
                  hideCompleted={hideCompleted}
                  onToggleHideCompleted={toggleHideCompleted}
                />
              </div>
            </>
          )}

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ResaleCostsCard kind="cost" costs={generalCosts} onAdd={addGeneralCost} onUpdate={updateGeneralCost} onDelete={deleteGeneralCost} />
            <ResaleCostsCard kind="expense" costs={generalExpenses} onAdd={addGeneralCost} onUpdate={updateGeneralCost} onDelete={deleteGeneralCost} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <ResaleLogCard config={MILEAGE_LOG} log={mileageLog} />
            <ResaleLogCard config={HOURS_LOG} log={hoursLog} />
          </div>
        </>
      )}

      <motion.button
        {...tapScale}
        type="button"
        onClick={() => setAddingItem(true)}
        className="fixed bottom-24 right-4 z-30 flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-pink-600 dark:bg-emerald-400 px-4 text-sm font-semibold text-white dark:text-zinc-950 shadow-[0_8px_24px_-4px_rgba(219,39,119,0.5)] sm:pl-4 sm:pr-5 lg:bottom-6 lg:right-6"
        aria-label="Add stock"
      >
        <svg viewBox="0 0 20 20" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4v12M4 10h12" /></svg>
        <span className="hidden sm:inline">Add Stock</span>
      </motion.button>

      <AnimatePresence>
        {addingItem && (
          <AddItemModal items={items} onAdd={addItem} onClose={() => setAddingItem(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
