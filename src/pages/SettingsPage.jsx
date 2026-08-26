import { useState } from 'react'
import Card from '../components/Card'
import PotRow from '../components/PotRow'
import FixedCostsCard from '../components/FixedCostsCard'
import { useAuth } from '../context/AuthContext'
import { useSavingsPots } from '../hooks/useSavingsPots'
import { useSpendingCategories } from '../hooks/useSpendingCategories'
import { useFixedCosts } from '../hooks/useFixedCosts'
import { motion } from 'framer-motion'
import { tapScale } from '../components/motion'

function AppearanceCard() {
  const { theme, setTheme } = useAuth()

  const options = [
    { value: 'pink', label: 'Pink', swatch: 'bg-gradient-to-r from-pink-500 to-rose-400' },
    { value: 'dark', label: 'Dark', swatch: 'bg-gradient-to-r from-zinc-900 to-emerald-500' },
  ]

  return (
    <Card title="Appearance" className="mb-5">
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">Choose the theme for your account.</p>
      <div className="flex gap-3">
        {options.map((opt) => (
          <motion.button {...tapScale}
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors duration-150 ${
              theme === opt.value
                ? 'border-pink-600 dark:border-emerald-400 text-pink-700 dark:text-emerald-400'
                : 'border-zinc-300 dark:border-white/15 text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <span className={`h-3 w-3 rounded-full ${opt.swatch}`} aria-hidden="true" />
            {opt.label}
          </motion.button>
        ))}
      </div>
    </Card>
  )
}

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
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        These are the pots your monthly leftover splits into. Percentages should add up to 100%.
      </p>
      {pots.length === 0 ? (
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">No pots yet.</p>
      ) : (
        <ul className="mb-4 flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
          {pots.map((pot) => (
            <PotRow key={pot.id} pot={pot} onUpdate={updatePot} onDelete={deletePot} />
          ))}
        </ul>
      )}

      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Pot name"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400"
        />
        <div className="flex items-center gap-2">
          <div className="flex min-h-11 w-24 items-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-2 text-sm">
            <input
              type="number"
              min="0"
              max="100"
              value={newPct}
              onChange={(e) => setNewPct(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent px-1 text-zinc-900 dark:text-zinc-100 outline-none"
            />
            <span className="text-zinc-500 dark:text-zinc-400">%</span>
          </div>
          <motion.button {...tapScale}
            type="submit"
            disabled={adding || !newName.trim()}
            className="min-h-11 flex-1 cursor-pointer rounded-lg bg-pink-600 dark:bg-emerald-400 px-4 text-sm font-medium text-white dark:text-zinc-950 transition-colors duration-150 hover:bg-pink-500 dark:hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            Add
          </motion.button>
        </div>
      </form>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-200 dark:border-white/10 pt-4 text-sm">
        <span className="text-zinc-500 dark:text-zinc-400">Total percentage</span>
        <span className={`font-medium ${totalPct === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-400 dark:text-amber-300'}`}>
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
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">The categories you log weekly spending against.</p>
      {categories.length === 0 ? (
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">No categories yet.</p>
      ) : (
        <ul className="mb-4 flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
          {categories.map((cat) => (
            <li key={cat.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <input
                type="text"
                defaultValue={cat.name}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== cat.name) renameCategory(cat.id, e.target.value.trim())
                }}
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-3 text-zinc-800 dark:text-zinc-200 outline-none focus:border-pink-600 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-[var(--surface-dark)]"
              />
              <motion.button {...tapScale}
                type="button"
                onClick={() => deleteCategory(cat.id)}
                className="min-h-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-red-600 dark:text-red-400 transition-colors duration-150 hover:bg-red-100 dark:hover:bg-red-500/10"
              >
                Delete
              </motion.button>
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
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400"
        />
        <motion.button {...tapScale}
          type="submit"
          disabled={adding || !newName.trim()}
          className="min-h-11 cursor-pointer rounded-lg bg-pink-600 dark:bg-emerald-400 px-4 text-sm font-medium text-white dark:text-zinc-950 transition-colors duration-150 hover:bg-pink-500 dark:hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </motion.button>
      </form>
    </Card>
  )
}

// The sidebar's own sign-out button is desktop-only (it lives in a
// lg:block-only footer), so this is the only way to sign out on mobile --
// it needs to exist here regardless of screen size.
function AccountCard() {
  const { user, signOut } = useAuth()

  return (
    <Card title="Account" className="mb-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{user?.name}</div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Signed in on this device</p>
        </div>
        <motion.button
          {...tapScale}
          type="button"
          onClick={signOut}
          className="min-h-11 cursor-pointer rounded-lg border border-red-300 px-4 text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-100 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          Sign out
        </motion.button>
      </div>
    </Card>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { costs, addCost, updateCost, deleteCost } = useFixedCosts(user?.id)
  const ongoingCosts = costs.filter((c) => !c.end_month)
  const ongoingTotal = ongoingCosts.reduce((t, c) => t + (Number(c.amount) || 0), 0)

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Settings</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Manage your pots, categories, and fixed costs any time.</p>
      </div>

      <AppearanceCard />
      <PotsCard />
      <CategoriesCard />
      <FixedCostsCard
        costs={ongoingCosts}
        total={ongoingTotal}
        addCost={addCost}
        updateCost={updateCost}
        onRemove={deleteCost}
        removeLabel="Delete"
        showRange
        description="Costs still applying each month. New ones start from this month onward. Deleting here removes a cost completely, including past months, so use it only to fix a mistake."
        emptyLabel="No ongoing fixed costs."
      />
      <AccountCard />
    </div>
  )
}
