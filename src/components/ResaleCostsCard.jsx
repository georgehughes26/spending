import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Card from './Card'
import CardAddButton from './CardAddButton'
import { tapScale } from './motion'
import { formatGBP } from '../utils/format'

const inputClass =
  'min-h-11 w-full min-w-0 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400'

const today = () => new Date().toISOString().slice(0, 10)

// The two lists that share the resale_general_costs table, keyed by its
// `kind` column ('cost' / 'expense' in the database).
const COST_LISTS = {
  cost: {
    title: 'Direct Costs',
    description: "Costs of selling that aren't tied to one item, like namesets and mailing bags. Taken off sales, along with your stock costs, for Gross Profit.",
    addTitle: 'Add direct cost',
    placeholder: 'e.g. Mailing bags',
    emptyLabel: 'No direct costs yet.',
  },
  expense: {
    title: 'Overheads',
    description: 'Running costs of the business, like subscriptions, the web domain or ads. Taken off Gross Profit for Net Profit.',
    addTitle: 'Add overhead',
    placeholder: 'e.g. Claude Pro',
    emptyLabel: 'No overheads yet.',
  },
}

function AmountInput({ value, onChange }) {
  return (
    <div className="flex h-11 items-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm focus-within:border-pink-600 dark:focus-within:border-emerald-400">
      <span className="text-zinc-500 dark:text-zinc-400">£</span>
      <input
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full bg-transparent px-1 text-zinc-900 dark:text-zinc-100 outline-none"
      />
    </div>
  )
}

function AddCostModal({ kind, onAdd, onClose }) {
  const list = COST_LISTS[kind]
  const [label, setLabel] = useState('')
  const [boughtFrom, setBoughtFrom] = useState('')
  const [date, setDate] = useState(today)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!label.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onAdd(label.trim(), Number(amount) || 0, date || today(), boughtFrom.trim() || null, kind)
      onClose()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 dark:bg-[var(--surface-dark)] sm:rounded-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{list.addTitle}</h3>
        <div className="mb-4 flex flex-col gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500 dark:text-zinc-400">What was it?</span>
            <input type="text" autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder={list.placeholder} className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Bought from (optional)</span>
            <input type="text" value={boughtFrom} onChange={(e) => setBoughtFrom(e.target.value)} className={inputClass} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Amount</span>
              <AmountInput value={amount} onChange={setAmount} />
            </label>
          </div>
        </div>
        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex items-center gap-3">
          <motion.button
            {...tapScale}
            type="submit"
            disabled={saving || !label.trim()}
            className="min-h-11 flex-1 cursor-pointer rounded-lg bg-pink-600 dark:bg-emerald-400 text-sm font-medium text-white dark:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add'}
          </motion.button>
          <motion.button {...tapScale} type="button" onClick={onClose} className="min-h-11 cursor-pointer px-3 text-sm text-zinc-500 dark:text-zinc-400">
            Cancel
          </motion.button>
        </div>
      </motion.form>
    </motion.div>
  )
}

function CostRow({ cost, onUpdate, onDelete, moveTo }) {
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

  const handleMove = async () => {
    setSaving(true)
    setError(null)
    try {
      await onUpdate(cost.id, { kind: moveTo })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 py-3">
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className={inputClass} />
        <input type="text" value={boughtFrom} onChange={(e) => setBoughtFrom(e.target.value)} placeholder="Bought from (optional)" className={inputClass} />
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          <AmountInput value={amount} onChange={setAmount} />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex items-center gap-3">
          <motion.button {...tapScale} type="button" onClick={handleSave} disabled={saving || !label.trim()} className="min-h-9 cursor-pointer whitespace-nowrap rounded-lg bg-pink-600 dark:bg-emerald-400 px-4 text-sm font-medium text-white dark:text-zinc-950 disabled:opacity-50">
            Save
          </motion.button>
          <motion.button {...tapScale} type="button" onClick={() => setEditing(false)} className="min-h-9 cursor-pointer px-2 text-sm text-zinc-500 dark:text-zinc-400">
            Cancel
          </motion.button>
          <button type="button" onClick={handleMove} disabled={saving} className="ml-auto min-h-9 cursor-pointer px-2 text-xs font-medium text-pink-700 dark:text-emerald-400 hover:underline disabled:opacity-50">
            Move to {COST_LISTS[moveTo].title}
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="min-w-0 text-zinc-700 dark:text-zinc-300">
        {cost.label} <span className="text-xs text-zinc-500 dark:text-zinc-400">· {cost.cost_date}{cost.bought_from ? ` · ${cost.bought_from}` : ''}</span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
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

// Direct Costs or Overheads -- costs not tied to any one item, one card per
// kind side by side under the stock list. Both work identically; they only
// differ in which profit figure they come off. Adding goes through the +
// pop-up, same as the Mileage / Hours Worked cards.
export default function ResaleCostsCard({ kind, costs, onAdd, onUpdate, onDelete }) {
  const list = COST_LISTS[kind]
  const otherKind = kind === 'cost' ? 'expense' : 'cost'
  const [adding, setAdding] = useState(false)

  const total = costs.reduce((t, c) => t + (Number(c.amount) || 0), 0)

  return (
    <Card title={list.title} className="h-full" action={<CardAddButton label={list.addTitle} onClick={() => setAdding(true)} />}>
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">{list.description}</p>
      {costs.length > 0 ? (
        <ul className="flex max-h-96 flex-col divide-y divide-zinc-200 overflow-y-auto dark:divide-white/10">
          {costs.map((cost) => (
            <CostRow key={cost.id} cost={cost} onUpdate={onUpdate} onDelete={onDelete} moveTo={otherKind} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{list.emptyLabel}</p>
      )}
      {costs.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-zinc-200 dark:border-white/10 pt-3 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Total</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatGBP(total, { pence: true })}</span>
        </div>
      )}

      <AnimatePresence>
        {adding && <AddCostModal kind={kind} onAdd={onAdd} onClose={() => setAdding(false)} />}
      </AnimatePresence>
    </Card>
  )
}
