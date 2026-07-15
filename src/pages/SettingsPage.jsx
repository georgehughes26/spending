import { useState } from 'react'
import Card from '../components/Card'
import PotRow from '../components/PotRow'
import FixedCostsCard from '../components/FixedCostsCard'
import { useAuth } from '../context/AuthContext'
import { useSavingsPots } from '../hooks/useSavingsPots'
import { useSpendingCategories } from '../hooks/useSpendingCategories'
import { useFixedCosts } from '../hooks/useFixedCosts'

function PotsCard() {
  const { user } = useAuth()
  const { pots, addPot, updatePot, deletePot } = useSavingsPots(user?.id)
  const [newName, setNewName] = useState('')
  const [newPct, setNewPct] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)

  const totalPct = pots.reduce((t, p) => t + p.percentage * 100, 0)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    setError(null)
    try {
      await addPot({ name: newName.trim(), percentage: (Number(newPct) || 0) / 100, startingBalance: 0 })
      setNewName('')
      setNewPct('')
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <Card title="Savings Pots" className="mb-5">
      <p className="mb-4 text-sm text-zinc-500">
        These are the pots your monthly leftover splits into. Percentages should add up to 100%.
      </p>
      {pots.length === 0 ? (
        <p className="mb-4 text-sm text-zinc-500">No pots yet.</p>
      ) : (
        <ul className="mb-4 flex flex-col divide-y divide-zinc-800">
          {pots.map((pot) => (
            <PotRow key={pot.id} pot={pot} onUpdate={updatePot} onDelete={deletePot} />
          ))}
        </ul>
      )}

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Pot name"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-pink-600"
        />
        <div className="flex items-center gap-2">
          <div className="flex min-h-11 w-24 items-center rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-sm">
            <input
              type="number"
              min="0"
              max="100"
              value={newPct}
              onChange={(e) => setNewPct(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent px-1 text-zinc-100 outline-none"
            />
            <span className="text-zinc-500">%</span>
          </div>
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="min-h-11 flex-1 cursor-pointer rounded-lg bg-pink-600 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            Add
          </button>
        </div>
      </form>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4 text-sm">
        <span className="text-zinc-400">Total percentage</span>
        <span className={`font-medium ${totalPct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
          {totalPct}%
        </span>
      </div>
    </Card>
  )
}

function CategoriesCard() {
  const { user } = useAuth()
  const { categories, addCategory, renameCategory, deleteCategory } = useSpendingCategories(user?.id)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    try {
      await addCategory(newName.trim())
      setNewName('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Card title="Spending Categories" className="mb-5">
      <p className="mb-4 text-sm text-zinc-500">The categories you log weekly spending against.</p>
      {categories.length === 0 ? (
        <p className="mb-4 text-sm text-zinc-500">No categories yet.</p>
      ) : (
        <ul className="mb-4 flex flex-col divide-y divide-zinc-800">
          {categories.map((cat) => (
            <li key={cat.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <input
                type="text"
                defaultValue={cat.name}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== cat.name) renameCategory(cat.id, e.target.value.trim())
                }}
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-3 text-zinc-200 outline-none focus:border-pink-600 focus:bg-zinc-900"
              />
              <button
                type="button"
                onClick={() => deleteCategory(cat.id)}
                className="min-h-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-red-400 transition-colors duration-150 hover:bg-red-950/30"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Gifts"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-pink-600"
        />
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="min-h-11 cursor-pointer rounded-lg bg-pink-600 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </Card>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { costs, total, addCost, updateCost, deleteCost } = useFixedCosts(user?.id)

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-50">Settings</h2>
        <p className="mt-1 text-sm text-zinc-500">Manage your pots, categories, and fixed costs any time.</p>
      </div>

      <PotsCard />
      <CategoriesCard />
      <FixedCostsCard costs={costs} total={total} addCost={addCost} updateCost={updateCost} deleteCost={deleteCost} />
    </div>
  )
}
