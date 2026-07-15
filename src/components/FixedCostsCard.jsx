import { useState } from 'react'
import Card from './Card'
import { formatGBP } from '../utils/format'

function FixedCostRow({ cost, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(cost.name)
  const [amount, setAmount] = useState(cost.amount)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdate(cost.id, { name, amount: Number(amount) || 0 })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-pink-600"
        />
        <div className="flex items-center gap-2">
          <div className="flex w-28 items-center rounded-lg border border-zinc-300 bg-white px-2 py-2.5 focus-within:border-pink-600">
            <span className="text-zinc-500">£</span>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent px-1 text-sm text-zinc-900 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="min-h-11 cursor-pointer whitespace-nowrap rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-pink-500 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="min-h-11 cursor-pointer whitespace-nowrap px-2 text-sm text-zinc-500 transition-colors duration-150 hover:text-zinc-700"
          >
            Cancel
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2 text-sm">
      <span className="text-zinc-800">{cost.name}</span>
      <div className="flex items-center gap-1">
        <span className="mr-2 font-medium text-zinc-900">{formatGBP(cost.amount)}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-h-11 min-w-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-pink-600 transition-colors duration-150 hover:bg-pink-100 hover:text-pink-700"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(cost.id)}
          className="min-h-11 min-w-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-100 hover:text-red-600"
        >
          Delete
        </button>
      </div>
    </li>
  )
}

export default function FixedCostsCard({ costs, total, addCost, updateCost, deleteCost }) {
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    try {
      await addCost(newName.trim(), Number(newAmount) || 0)
      setNewName('')
      setNewAmount('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Card title="Fixed Monthly Costs" className="mb-5">
      <p className="mb-3 text-sm text-zinc-500">
        Recurring costs like rent, subscriptions, or council tax. The same total applies every month until you
        change something here.
      </p>

      {costs.length === 0 ? (
        <p className="mb-4 text-sm text-zinc-500">No fixed costs added yet.</p>
      ) : (
        <ul className="mb-4 flex flex-col divide-y divide-zinc-200">
          {costs.map((cost) => (
            <FixedCostRow key={cost.id} cost={cost} onUpdate={updateCost} onDelete={deleteCost} />
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Rent"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-pink-600"
        />
        <div className="flex items-center gap-2">
          <div className="flex w-28 items-center rounded-lg border border-zinc-300 bg-white px-2 py-2.5 text-sm focus-within:border-pink-600">
            <span className="text-zinc-500">£</span>
            <input
              type="number"
              min="0"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent px-1 text-zinc-900 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="min-h-11 flex-1 cursor-pointer whitespace-nowrap rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            Add
          </button>
        </div>
      </form>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4 text-sm">
        <span className="text-zinc-500">Total fixed costs</span>
        <span className="font-medium text-zinc-900">{formatGBP(total)}</span>
      </div>
    </Card>
  )
}
