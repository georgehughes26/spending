import { useState } from 'react'
import { formatGBP, formatMonthYear } from '../utils/format'
import { itemAllInCost, itemPotentialProfit, itemProfit } from '../data/deriveResale'

const STATUS_STYLES = {
  purchased: 'bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-300',
  arrived: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  listed: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  sold: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
}

const STATUS_LABELS = { purchased: 'Purchased', arrived: 'Arrived', listed: 'Listed', sold: 'Sold' }

const inputClass =
  'min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400'

export default function ResaleItemRow({ item, onUpdate, onDelete, onMarkArrived, onMarkListed, onMarkSold, onMarkPaid, onAddCost, onDeleteCost }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [category, setCategory] = useState(item.category ?? '')
  const [platform, setPlatform] = useState(item.platform ?? '')
  const [costPrice, setCostPrice] = useState(item.cost_price)
  const [targetPrice, setTargetPrice] = useState(item.target_price ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [soldPrice, setSoldPrice] = useState(item.sold_price ?? item.target_price ?? item.cost_price ?? '')
  const [soldDate, setSoldDate] = useState(item.sold_date ?? new Date().toISOString().slice(0, 10))
  const [newCostLabel, setNewCostLabel] = useState('')
  const [newCostAmount, setNewCostAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const extra = (item.resale_item_costs ?? []).reduce((t, c) => t + (Number(c.amount) || 0), 0)
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
        category: category.trim() || null,
        platform: platform.trim() || null,
        cost_price: Number(costPrice) || 0,
        target_price: targetPrice === '' ? null : Number(targetPrice),
        notes: notes.trim() || null,
        ...(item.status === 'sold'
          ? { sold_price: Number(soldPrice) || 0, sold_date: soldDate || null }
          : {}),
      })
      setEditing(false)
    })

  const handleMarkSold = () =>
    run(async () => {
      await onMarkSold(item.id, Number(soldPrice) || 0, soldDate)
    })

  const handleAddCost = (e) => {
    e.preventDefault()
    if (!newCostLabel.trim()) return
    run(async () => {
      await onAddCost(item.id, newCostLabel.trim(), Number(newCostAmount) || 0)
      setNewCostLabel('')
      setNewCostAmount('')
    })
  }

  return (
    <li className="py-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex min-h-11 w-full cursor-pointer flex-wrap items-center justify-between gap-2 text-left text-sm"
      >
        <span className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}>
              {STATUS_LABELS[item.status]}
            </span>
            {item.status === 'sold' && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  item.payment_status === 'paid'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                }`}
              >
                {item.payment_status === 'paid' ? 'Paid' : 'Awaiting payment'}
              </span>
            )}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Bought for {formatGBP(item.cost_price, { pence: true })}
            {item.status === 'sold' && item.sold_price != null && ` · Sold for ${formatGBP(item.sold_price, { pence: true })}`}
            {item.status !== 'sold' && item.target_price != null && ` · Target ${formatGBP(item.target_price, { pence: true })}`}
          </span>
        </span>
        <span className="flex items-center gap-3">
          {profit != null && (
            <span className={`font-medium ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatGBP(profit, { pence: true, showSign: true })}
            </span>
          )}
          {profit == null && potentialProfit != null && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              est. {formatGBP(potentialProfit, { pence: true, showSign: true })}
            </span>
          )}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{expanded ? 'Hide' : 'Details'}</span>
        </span>
      </button>

      {expanded && (
        <div className="mt-3 rounded-lg border border-zinc-200 dark:border-white/10 bg-pink-50 dark:bg-white/5 p-4">
          {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

          {editing ? (
            <div className="mb-4 flex flex-col gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" className={inputClass} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (optional)" className={inputClass} />
                <input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Platform (optional)" className={inputClass} />
                <label className="text-sm">
                  <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Cost price</span>
                  <input type="number" min="0" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className={inputClass} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Target sell price</span>
                  <input type="number" min="0" step="0.01" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className={inputClass} />
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
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="min-h-11 cursor-pointer rounded-lg bg-pink-600 dark:bg-emerald-400 px-4 text-sm font-medium text-white dark:text-zinc-950 transition-colors duration-150 hover:bg-pink-500 dark:hover:bg-emerald-300 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="min-h-11 cursor-pointer px-2 text-sm text-zinc-500 dark:text-zinc-400 transition-colors duration-150 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  Cancel
                </button>
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
              {(item.category || item.platform) && (
                <div className="col-span-2 text-xs text-zinc-500 dark:text-zinc-400 sm:col-span-4">
                  {[item.category, item.platform].filter(Boolean).join(' · ')}
                </div>
              )}
              {item.notes && <div className="col-span-2 text-xs text-zinc-500 dark:text-zinc-400 sm:col-span-4">{item.notes}</div>}
            </div>
          )}

          <div className="mb-4 border-t border-zinc-200 dark:border-white/10 pt-3">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <span>Additional costs</span>
              <span>{formatGBP(extra, { pence: true })}</span>
            </div>
            {item.resale_item_costs?.length > 0 && (
              <ul className="mb-2 flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
                {item.resale_item_costs.map((cost) => (
                  <li key={cost.id} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-zinc-700 dark:text-zinc-300">{cost.label}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-zinc-900 dark:text-zinc-100">{formatGBP(cost.amount, { pence: true })}</span>
                      <button
                        type="button"
                        onClick={() => run(() => onDeleteCost(cost.id))}
                        className="cursor-pointer text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleAddCost} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={newCostLabel}
                onChange={(e) => setNewCostLabel(e.target.value)}
                placeholder="e.g. Vinted bump"
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400"
              />
              <div className="flex items-center gap-2">
                <div className="flex h-11 w-24 shrink-0 items-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-2 text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">£</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newCostAmount}
                    onChange={(e) => setNewCostAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent px-1 text-zinc-900 dark:text-zinc-100 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-11 flex-1 cursor-pointer whitespace-nowrap rounded-lg border border-pink-300 dark:border-emerald-500/40 px-3 text-sm font-medium text-pink-700 dark:text-emerald-400 transition-colors duration-150 hover:bg-pink-100 dark:hover:bg-emerald-500/10 sm:flex-none"
                >
                  Add
                </button>
              </div>
            </form>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 dark:border-white/10 pt-3">
            {item.status === 'purchased' && (
              <button type="button" onClick={() => run(() => onMarkArrived(item.id))} disabled={saving} className="min-h-11 cursor-pointer rounded-lg bg-pink-600 dark:bg-emerald-400 px-4 text-sm font-medium text-white dark:text-zinc-950 transition-colors duration-150 hover:bg-pink-500 dark:hover:bg-emerald-300 disabled:opacity-50">
                Mark arrived
              </button>
            )}
            {item.status === 'arrived' && (
              <button type="button" onClick={() => run(() => onMarkListed(item.id))} disabled={saving} className="min-h-11 cursor-pointer rounded-lg bg-pink-600 dark:bg-emerald-400 px-4 text-sm font-medium text-white dark:text-zinc-950 transition-colors duration-150 hover:bg-pink-500 dark:hover:bg-emerald-300 disabled:opacity-50">
                Mark listed
              </button>
            )}
            {item.status === 'listed' && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <div className="flex h-11 w-24 shrink-0 items-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-2 text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">£</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={soldPrice}
                      onChange={(e) => setSoldPrice(e.target.value)}
                      className="w-full bg-transparent px-1 text-zinc-900 dark:text-zinc-100 outline-none"
                    />
                  </div>
                  <input
                    type="date"
                    value={soldDate}
                    onChange={(e) => setSoldDate(e.target.value)}
                    className="h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400 sm:flex-none"
                  />
                </div>
                <button type="button" onClick={handleMarkSold} disabled={saving} className="min-h-11 w-full cursor-pointer whitespace-nowrap rounded-lg bg-pink-600 dark:bg-emerald-400 px-4 text-sm font-medium text-white dark:text-zinc-950 transition-colors duration-150 hover:bg-pink-500 dark:hover:bg-emerald-300 disabled:opacity-50 sm:w-auto">
                  Mark sold
                </button>
              </div>
            )}
            {item.status === 'sold' && item.payment_status !== 'paid' && (
              <button type="button" onClick={() => run(() => onMarkPaid(item.id))} disabled={saving} className="min-h-11 cursor-pointer rounded-lg bg-pink-600 dark:bg-emerald-400 px-4 text-sm font-medium text-white dark:text-zinc-950 transition-colors duration-150 hover:bg-pink-500 dark:hover:bg-emerald-300 disabled:opacity-50">
                Mark paid
              </button>
            )}
            {item.status === 'sold' && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Sold {item.sold_date ? formatMonthYear(item.sold_date) : ''}
              </span>
            )}
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="min-h-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-pink-600 dark:text-emerald-400 transition-colors duration-150 hover:bg-pink-100 dark:hover:bg-emerald-500/10"
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete "${item.name}"? This can't be undone.`)) onDelete(item.id)
              }}
              className="min-h-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-red-600 dark:text-red-400 transition-colors duration-150 hover:bg-red-100 dark:hover:bg-red-500/10"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
