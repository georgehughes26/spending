import { useMemo, useState } from 'react'
import Card from '../components/Card'
import ResaleItemRow from '../components/ResaleItemRow'
import ResaleTimeSeriesChart from '../components/ResaleTimeSeriesChart'
import { useAuth } from '../context/AuthContext'
import { useResaleItems } from '../hooks/useResaleItems'
import { deriveResaleSummary, deriveResaleTimeSeries } from '../data/deriveResale'
import { formatGBP } from '../utils/format'

const STAGES = [
  { value: 'all', label: 'All' },
  { value: 'purchased', label: 'Purchased' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'listed', label: 'Listed' },
  { value: 'sold', label: 'Sold' },
]

const inputClass =
  'min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400'

function emptyForm() {
  return { name: '', category: '', platform: '', costPrice: '', targetPrice: '', purchasedDate: new Date().toISOString().slice(0, 10) }
}

function AddItemCard({ onAdd }) {
  const [form, setForm] = useState(emptyForm())
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setAdding(true)
    setError(null)
    try {
      await onAdd({
        name: form.name.trim(),
        category: form.category.trim() || null,
        platform: form.platform.trim() || null,
        cost_price: Number(form.costPrice) || 0,
        target_price: form.targetPrice === '' ? null : Number(form.targetPrice),
        purchased_date: form.purchasedDate,
      })
      setForm(emptyForm())
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <Card title="Add Stock" className="mb-5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input value={form.name} onChange={set('name')} placeholder="Item name" className={inputClass} />
          <input value={form.category} onChange={set('category')} placeholder="Category (optional)" className={`hidden sm:block ${inputClass}`} />
          <input value={form.platform} onChange={set('platform')} placeholder="Platform (optional)" className={`hidden sm:block ${inputClass}`} />
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Purchased date</span>
            <input type="date" value={form.purchasedDate} onChange={set('purchasedDate')} className={`max-w-[200px] sm:max-w-none ${inputClass}`} />
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
        <button
          type="submit"
          disabled={adding || !form.name.trim()}
          className="min-h-11 cursor-pointer self-start rounded-lg bg-pink-600 dark:bg-emerald-400 px-5 text-sm font-medium text-white dark:text-zinc-950 transition-colors duration-150 hover:bg-pink-500 dark:hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {adding ? 'Adding…' : 'Add to stock'}
        </button>
      </form>
    </Card>
  )
}

function SummaryCards({ summary }) {
  const stats = [
    { label: 'Total Cost', value: formatGBP(summary.totalCost, { pence: true }), tone: 'text-zinc-900 dark:text-zinc-100' },
    { label: 'Total Sales', value: formatGBP(summary.totalSales, { pence: true }), tone: 'text-zinc-900 dark:text-zinc-100' },
    { label: 'Total Profit', value: formatGBP(summary.totalProfit, { pence: true, showSign: true }), tone: summary.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' },
    { label: 'Potential Profit', value: formatGBP(summary.potentialProfit, { pence: true, showSign: true }), tone: 'text-zinc-900 dark:text-zinc-100' },
  ]

  return (
    <Card title="Performance" className="mb-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0">
            <div className="truncate text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{s.label}</div>
            <div className={`mt-1 truncate text-lg font-semibold ${s.tone}`}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-zinc-200 dark:border-white/10 pt-4 sm:grid-cols-4">
        {['purchased', 'arrived', 'listed', 'sold'].map((stage) => (
          <div key={stage}>
            <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400 capitalize">{stage}</div>
            <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{summary.stageCounts[stage] ?? 0}</div>
          </div>
        ))}
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
    markArrived,
    markListed,
    markSold,
    markPaid,
    addItemCost,
    deleteItemCost,
  } = useResaleItems(user?.id)
  const [filter, setFilter] = useState('all')
  const [granularity, setGranularity] = useState('month')

  const summary = useMemo(() => deriveResaleSummary(items), [items])
  const timeSeries = useMemo(() => deriveResaleTimeSeries(items, granularity), [items, granularity])
  const filteredItems = filter === 'all' ? items : items.filter((i) => i.status === filter)
  const isCompleted = (item) => item.status === 'sold' && item.payment_status === 'paid'
  const activeItems = filteredItems.filter((i) => !isCompleted(i))
  const completedItems = filteredItems.filter(isCompleted)
  const initialLoading = loading && items.length === 0

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Reselling</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Track stock from purchase through to payout, and see how you're performing.
        </p>
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
          <SummaryCards summary={summary} />
          <div className="mb-5">
            <ResaleTimeSeriesChart data={timeSeries} granularity={granularity} onGranularityChange={setGranularity} />
          </div>
          <AddItemCard onAdd={addItem} />

          <Card title="Stock">
            <div className="mb-4 flex flex-wrap gap-2">
              {STAGES.map((stage) => (
                <button
                  key={stage.value}
                  type="button"
                  onClick={() => setFilter(stage.value)}
                  className={`min-h-11 cursor-pointer rounded-lg border px-3 text-sm font-medium transition-colors duration-150 ${
                    filter === stage.value
                      ? 'border-pink-600 dark:border-emerald-400 bg-pink-600 dark:bg-emerald-400 text-white dark:text-zinc-950'
                      : 'border-zinc-300 dark:border-white/15 text-zinc-500 dark:text-zinc-400 hover:text-pink-700 dark:hover:text-emerald-400'
                  }`}
                >
                  {stage.label}
                </button>
              ))}
            </div>

            {filteredItems.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {items.length === 0 ? 'No stock added yet. Use the form above to add your first item.' : 'Nothing at this stage.'}
              </p>
            ) : (
              <>
                {activeItems.length > 0 && (
                  <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
                    {activeItems.map((item) => (
                      <ResaleItemRow
                        key={item.id}
                        item={item}
                        onUpdate={updateItem}
                        onDelete={deleteItem}
                        onMarkArrived={markArrived}
                        onMarkListed={markListed}
                        onMarkSold={markSold}
                        onMarkPaid={markPaid}
                        onAddCost={addItemCost}
                        onDeleteCost={deleteItemCost}
                      />
                    ))}
                  </ul>
                )}

                {completedItems.length > 0 && (
                  <div className={activeItems.length > 0 ? 'mt-6' : ''}>
                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Completed
                    </h3>
                    <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-white/10 opacity-50">
                      {completedItems.map((item) => (
                        <ResaleItemRow
                          key={item.id}
                          item={item}
                          onUpdate={updateItem}
                          onDelete={deleteItem}
                          onMarkArrived={markArrived}
                          onMarkListed={markListed}
                          onMarkSold={markSold}
                          onMarkPaid={markPaid}
                          onAddCost={addItemCost}
                          onDeleteCost={deleteItemCost}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
