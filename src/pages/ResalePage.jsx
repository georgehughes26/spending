import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Card from '../components/Card'
import ResaleBoard from '../components/ResaleBoard'
import MobileResaleBoard from '../components/MobileResaleBoard'
import ResaleTimeSeriesChart from '../components/ResaleTimeSeriesChart'
import ResaleLogisticsCard from '../components/ResaleLogisticsCard'
import { AnimatedNumber, tapScale } from '../components/motion'
import { useAuth } from '../context/AuthContext'
import { useResaleItems } from '../hooks/useResaleItems'
import { useResaleGeneralCosts } from '../hooks/useResaleGeneralCosts'
import { deriveResaleLogistics, deriveResaleSummary, deriveResaleTimeSeries } from '../data/deriveResale'
import { exportResaleToExcel } from '../utils/resaleExport'
import { formatGBP } from '../utils/format'

const inputClass =
  'min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400'

const SHIPPING_COMPANIES = ['Evri', 'InPost', 'Royal Mail']
const BOUGHT_FROM_OPTIONS = ['Vinted', 'eBay', 'Other']

function emptyForm() {
  return { name: '', shippingIn: '', boughtFrom: '', costPrice: '', targetPrice: '', purchasedDate: new Date().toISOString().slice(0, 10) }
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
        shipping_in: form.shippingIn || null,
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
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Shipping in (optional)</span>
          <select value={form.shippingIn} onChange={set('shippingIn')} className={inputClass}>
            <option value="">—</option>
            {SHIPPING_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
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

function GeneralCostRow({ cost, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(cost.label)
  const [amount, setAmount] = useState(cost.amount)
  const [date, setDate] = useState(cost.cost_date)
  const [boughtFrom, setBoughtFrom] = useState(cost.bought_from ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await onUpdate(cost.id, { label, amount: Number(amount) || 0, cost_date: date, bought_from: boughtFrom.trim() || null })
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400"
          />
          <input
            type="text"
            value={boughtFrom}
            onChange={(e) => setBoughtFrom(e.target.value)}
            placeholder="Bought from (optional)"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="min-h-11 shrink-0 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none"
          />
          <div className="flex h-11 w-24 shrink-0 items-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-2 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">£</span>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-transparent px-1 text-zinc-900 dark:text-zinc-100 outline-none" />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex items-center gap-3">
          <motion.button {...tapScale} type="button" onClick={handleSave} disabled={saving || !label.trim()} className="min-h-9 cursor-pointer whitespace-nowrap rounded-lg bg-pink-600 dark:bg-emerald-400 px-4 text-sm font-medium text-white dark:text-zinc-950 disabled:opacity-50">
            Save
          </motion.button>
          <motion.button {...tapScale} type="button" onClick={() => setEditing(false)} className="min-h-9 cursor-pointer px-2 text-sm text-zinc-500 dark:text-zinc-400">
            Cancel
          </motion.button>
        </div>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between py-2 text-sm">
      <span className="text-zinc-700 dark:text-zinc-300">
        {cost.label} <span className="text-xs text-zinc-500 dark:text-zinc-400">· {cost.cost_date}{cost.bought_from ? ` · ${cost.bought_from}` : ''}</span>
      </span>
      <span className="flex items-center gap-3">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatGBP(cost.amount, { pence: true })}</span>
        <button type="button" onClick={() => setEditing(true)} className="cursor-pointer text-xs font-medium text-pink-700 dark:text-emerald-400 hover:underline">
          Edit
        </button>
        <button type="button" onClick={() => onDelete(cost.id)} className="cursor-pointer text-xs font-medium text-red-600 dark:text-red-400 hover:underline">
          Remove
        </button>
      </span>
    </li>
  )
}

// Costs that aren't tied to any one item -- packaging, a Vinted
// subscription, printer ink. Its own visible card on the page, under the
// stock list, rather than tucked inside the Add Stock flow -- it's part of
// the real cost picture, not a one-off aside.
function GeneralCostsCard({ costs, onAdd, onUpdate, onDelete }) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [boughtFrom, setBoughtFrom] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const total = costs.reduce((t, c) => t + (Number(c.amount) || 0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!label.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onAdd(label.trim(), Number(amount) || 0, date, boughtFrom.trim() || null)
      setLabel('')
      setAmount('')
      setBoughtFrom('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="General Costs">
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        Costs that aren't tied to one item -- packaging, subscriptions, postage supplies. Counted in Total Cost and Total Profit.
      </p>
      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Parcel tape"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400"
        />
        <input
          type="text"
          value={boughtFrom}
          onChange={(e) => setBoughtFrom(e.target.value)}
          placeholder="Bought from (optional)"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="min-h-11 shrink-0 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none"
        />
        <div className="flex items-center gap-2">
          <div className="flex h-11 w-24 shrink-0 items-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-2 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">£</span>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full bg-transparent px-1 text-zinc-900 dark:text-zinc-100 outline-none" />
          </div>
          <motion.button {...tapScale} type="submit" disabled={saving || !label.trim()} className="min-h-11 flex-1 cursor-pointer whitespace-nowrap rounded-lg border border-pink-300 dark:border-emerald-500/40 px-3 text-sm font-medium text-pink-700 dark:text-emerald-400 disabled:opacity-50 sm:flex-none">
            Add
          </motion.button>
        </div>
      </form>
      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {costs.length > 0 ? (
        <ul className="flex max-h-96 flex-col divide-y divide-zinc-200 overflow-y-auto dark:divide-white/10">
          {costs.map((cost) => (
            <GeneralCostRow key={cost.id} cost={cost} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No general costs yet.</p>
      )}
      {costs.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-zinc-200 dark:border-white/10 pt-3 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Total</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatGBP(total, { pence: true })}</span>
        </div>
      )}
    </Card>
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-white/80">Total profit</div>
          <AnimatedNumber value={summary.totalProfit} format="gbp" showSign className="block text-5xl font-bold tracking-tight tabular-nums text-white" />
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-white/80">Cost</div>
            <div className="text-lg font-semibold text-white">{formatGBP(summary.totalCost, { pence: true })}</div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-white/80">Sales</div>
            <div className="text-lg font-semibold text-white">{formatGBP(summary.totalSales, { pence: true })}</div>
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
    markPaid,
    markShipped,
  } = useResaleItems(user?.id)
  const { costs: generalCosts, addCost: addGeneralCost, updateCost: updateGeneralCost, deleteCost: deleteGeneralCost } = useResaleGeneralCosts(user?.id)
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

  const summary = useMemo(() => deriveResaleSummary(items, generalCosts), [items, generalCosts])
  const timeSeries = useMemo(() => deriveResaleTimeSeries(items, generalCosts, granularity), [items, generalCosts, granularity])
  const logistics = useMemo(() => deriveResaleLogistics(items), [items])
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
          onClick={() => exportResaleToExcel(items, generalCosts)}
          disabled={items.length === 0 && generalCosts.length === 0}
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
                  onMarkPaid={markPaid}
                  onMarkShipped={markShipped}
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
                  onMarkPaid={markPaid}
                  onMarkShipped={markShipped}
                  hideCompleted={hideCompleted}
                  onToggleHideCompleted={toggleHideCompleted}
                />
              </div>
            </>
          )}

          <div className="mt-5">
            <GeneralCostsCard costs={generalCosts} onAdd={addGeneralCost} onUpdate={updateGeneralCost} onDelete={deleteGeneralCost} />
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
