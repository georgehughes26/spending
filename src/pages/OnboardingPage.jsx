import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import NumberField from '../components/NumberField'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { formatGBP } from '../utils/format'

const DEFAULT_CATEGORIES = ['Food', 'Drinking', 'Shopping', 'Entertainment', 'Transport', 'Health', 'Other']

function emptyPot() {
  return { name: '', percentage: 0, startingBalance: 0, target: '', targetDate: '' }
}

function PotsStep({ pots, setPots }) {
  const totalPct = pots.reduce((t, p) => t + (Number(p.percentage) || 0), 0)

  const update = (i, key) => (value) => {
    setPots((prev) => prev.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)))
  }

  return (
    <Card title="Your savings pots">
      <p className="mb-4 text-sm text-zinc-500">
        What pots do you save into (LISA, cash, investments, etc.)? For each, how much do you currently have,
        and what % of your monthly leftover should go into it. Percentages should add up to 100%. Each month
        you'll enter the pot's real closing balance, so growth or loss shows up automatically — contributions
        are tracked separately as their own dashboard stat.
      </p>
      <div className="flex flex-col gap-4">
        {pots.map((pot, i) => (
          <div key={i} className="rounded-lg border border-zinc-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <input
                type="text"
                value={pot.name}
                onChange={(e) => update(i, 'name')(e.target.value)}
                placeholder="Pot name, e.g. LISA"
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-pink-600"
              />
              <button
                type="button"
                onClick={() => setPots((prev) => prev.filter((_, idx) => idx !== i))}
                className="min-h-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-100"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-zinc-500">% of leftover</span>
                <div className="flex min-h-11 items-center rounded-lg border border-zinc-300 bg-white px-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={pot.percentage}
                    onChange={(e) => update(i, 'percentage')(Number(e.target.value))}
                    className="w-full bg-transparent text-zinc-900 outline-none"
                  />
                  <span className="text-zinc-500">%</span>
                </div>
              </label>
              <NumberField
                id={`pot-start-${i}`}
                label="Current balance"
                value={pot.startingBalance}
                onChange={update(i, 'startingBalance')}
              />
              <NumberField
                id={`pot-target-${i}`}
                label="Target amount (optional)"
                value={pot.target}
                onChange={update(i, 'target')}
              />
              <label className="text-sm">
                <span className="mb-1 block text-zinc-500">Target date (optional)</span>
                <input
                  type="date"
                  value={pot.targetDate}
                  onChange={(e) => update(i, 'targetDate')(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-pink-600"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setPots((prev) => [...prev, emptyPot()])}
        className="mt-4 min-h-11 cursor-pointer rounded-lg border border-pink-300 px-4 text-sm font-medium text-pink-700 transition-colors duration-150 hover:bg-pink-100"
      >
        + Add a pot
      </button>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4 text-sm">
        <span className="text-zinc-500">Total percentage</span>
        <span className={`font-medium ${totalPct === 100 ? 'text-emerald-600' : 'text-amber-400'}`}>
          {totalPct}%
        </span>
      </div>
    </Card>
  )
}

function CategoriesStep({ categories, setCategories }) {
  const [newCategory, setNewCategory] = useState('')

  const add = () => {
    if (!newCategory.trim()) return
    setCategories((prev) => [...prev, newCategory.trim()])
    setNewCategory('')
  }

  return (
    <Card title="Your spending categories">
      <p className="mb-4 text-sm text-zinc-500">
        What categories do you want to track weekly spending against? We've suggested some common ones — edit,
        remove, or add your own.
      </p>
      <ul className="mb-4 flex flex-col divide-y divide-zinc-200">
        {categories.map((cat, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
            <input
              type="text"
              value={cat}
              onChange={(e) => setCategories((prev) => prev.map((c, idx) => (idx === i ? e.target.value : c)))}
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 outline-none focus:border-pink-600"
            />
            <button
              type="button"
              onClick={() => setCategories((prev) => prev.filter((_, idx) => idx !== i))}
              className="min-h-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-100"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="e.g. Gifts"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-pink-600"
        />
        <button
          type="button"
          onClick={add}
          className="min-h-11 cursor-pointer rounded-lg bg-pink-600 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-pink-500"
        >
          Add
        </button>
      </div>
    </Card>
  )
}

function FixedCostsStep({ fixedCosts, setFixedCosts }) {
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')

  const add = () => {
    if (!newName.trim()) return
    setFixedCosts((prev) => [...prev, { name: newName.trim(), amount: Number(newAmount) || 0 }])
    setNewName('')
    setNewAmount('')
  }

  const total = fixedCosts.reduce((t, c) => t + (Number(c.amount) || 0), 0)

  return (
    <Card title="Your fixed monthly costs">
      <p className="mb-4 text-sm text-zinc-500">
        Recurring costs like rent, subscriptions, or council tax. The same total applies every month until you
        change something later.
      </p>
      {fixedCosts.length > 0 && (
        <ul className="mb-4 flex flex-col divide-y divide-zinc-200">
          {fixedCosts.map((cost, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-zinc-800">{cost.name}</span>
              <div className="flex items-center gap-3">
                <span className="font-medium text-zinc-900">{formatGBP(cost.amount)}</span>
                <button
                  type="button"
                  onClick={() => setFixedCosts((prev) => prev.filter((_, idx) => idx !== i))}
                  className="min-h-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Rent"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-pink-600"
        />
        <div className="flex items-center gap-2">
          <div className="flex min-h-11 w-28 items-center rounded-lg border border-zinc-300 bg-white px-2 text-sm">
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
            type="button"
            onClick={add}
            className="min-h-11 flex-1 cursor-pointer rounded-lg bg-pink-600 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-pink-500 sm:flex-none"
          >
            Add
          </button>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4 text-sm">
        <span className="text-zinc-500">Total fixed costs</span>
        <span className="font-medium text-zinc-900">{formatGBP(total)}</span>
      </div>
    </Card>
  )
}

const STEPS = ['pots', 'categories', 'fixedCosts', 'review']

export default function OnboardingPage() {
  const { user, markOnboarded } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [pots, setPots] = useState([emptyPot()])
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [fixedCosts, setFixedCosts] = useState([])
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const potsTotal = pots.reduce((t, p) => t + (Number(p.percentage) || 0), 0)
  const potsValid = pots.length > 0 && pots.every((p) => p.name.trim()) && potsTotal === 100
  const categoriesValid = categories.length > 0 && categories.every((c) => c.trim())

  const canGoNext = step === 0 ? potsValid : step === 1 ? categoriesValid : true

  const handleFinish = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const { error: potsError } = await supabase.from('savings_pots').insert(
        pots.map((p, i) => ({
          user_id: user.id,
          name: p.name.trim(),
          percentage: (Number(p.percentage) || 0) / 100,
          starting_balance: Number(p.startingBalance) || 0,
          target: p.target === '' ? null : Number(p.target),
          target_date: p.targetDate || null,
          sort_order: i,
        })),
      )
      if (potsError) throw new Error(potsError.message)

      const { error: catError } = await supabase.from('spending_categories').insert(
        categories.map((name, i) => ({ user_id: user.id, name: name.trim(), sort_order: i })),
      )
      if (catError) throw new Error(catError.message)

      if (fixedCosts.length > 0) {
        const { error: fixedError } = await supabase.from('fixed_costs').insert(
          fixedCosts.map((c) => ({ user_id: user.id, name: c.name, amount: c.amount })),
        )
        if (fixedError) throw new Error(fixedError.message)
      }

      await markOnboarded()
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Welcome, {user?.name}</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Let's set your dashboard up — step {step + 1} of {STEPS.length}.
      </p>

      {step === 0 && <PotsStep pots={pots} setPots={setPots} />}
      {step === 1 && <CategoriesStep categories={categories} setCategories={setCategories} />}
      {step === 2 && <FixedCostsStep fixedCosts={fixedCosts} setFixedCosts={setFixedCosts} />}
      {step === 3 && (
        <Card title="Review">
          <p className="mb-4 text-sm text-zinc-500">Here's what we'll set up for you.</p>
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Pots ({potsTotal}%)
            </h3>
            <ul className="text-sm text-zinc-700">
              {pots.map((p, i) => (
                <li key={i}>
                  {p.name} — {p.percentage}% — {formatGBP(Number(p.startingBalance) || 0)} so far
                </li>
              ))}
            </ul>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Categories</h3>
            <p className="text-sm text-zinc-700">{categories.join(', ')}</p>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Fixed costs</h3>
            {fixedCosts.length === 0 ? (
              <p className="text-sm text-zinc-500">None added.</p>
            ) : (
              <ul className="text-sm text-zinc-700">
                {fixedCosts.map((c, i) => (
                  <li key={i}>{c.name} — {formatGBP(c.amount)}</li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="min-h-11 cursor-pointer rounded-lg px-4 text-sm font-medium text-zinc-500 transition-colors duration-150 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canGoNext}
            className="min-h-11 cursor-pointer rounded-lg bg-pink-600 px-5 text-sm font-medium text-white transition-colors duration-150 hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={submitting}
            className="min-h-11 cursor-pointer rounded-lg bg-pink-600 px-5 text-sm font-medium text-white transition-colors duration-150 hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Setting up…' : 'Finish setup'}
          </button>
        )}
      </div>
    </div>
  )
}
