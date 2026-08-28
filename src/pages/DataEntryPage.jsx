import { useEffect, useMemo, useRef, useState } from 'react'
import Card from '../components/Card'
import NumberField from '../components/NumberField'
import WeekEntryRow from '../components/WeekEntryRow'
import FixedCostsCard from '../components/FixedCostsCard'
import { useAuth } from '../context/AuthContext'
import { useMonthlyEntries } from '../hooks/useMonthlyEntries'
import { aggregateWeeklySpending, useWeeklySpending } from '../hooks/useWeeklySpending'
import { lastDayOfMonth } from '../utils/weeks'
import { useFixedCosts } from '../hooks/useFixedCosts'
import { useSavingsPots } from '../hooks/useSavingsPots'
import { useSpendingCategories } from '../hooks/useSpendingCategories'
import { formatGBP, formatMonthYear } from '../utils/format'
import { motion } from 'framer-motion'
import { tapScale } from '../components/motion'

const FIXED_COSTS_CATEGORY = 'Fixed Monthly Costs'

function currentMonthValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthValueToDate(monthValue) {
  return `${monthValue}-01`
}

function dateToMonthValue(dateString) {
  return dateString.slice(0, 7)
}

function emptyForm() {
  return {
    income: 0,
    notes: '',
  }
}

function emptyGoalSplit(pots) {
  return Object.fromEntries(pots.map((p) => [p.id, 0]))
}

function emptyClosingBalances(pots) {
  return Object.fromEntries(pots.map((p) => [p.id, Number(p.starting_balance) || 0]))
}

// Closing balances carry forward from whatever was last entered for each
// pot, falling back to its starting balance if nothing's been entered yet.
function latestClosingBalances(entries, pots, monthValue) {
  const prior = entries.filter((e) => dateToMonthValue(e.month) < monthValue)
  const last = prior[prior.length - 1]
  return Object.fromEntries(
    pots.map((pot) => [pot.id, last?.account_balances?.[pot.id] ?? (Number(pot.starting_balance) || 0)]),
  )
}

export default function DataEntryPage() {
  const { user } = useAuth()
  const { entries, loading, error, saveEntry, deleteEntry } = useMonthlyEntries(user?.id)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue())
  const [periodStart, setPeriodStart] = useState(monthValueToDate(currentMonthValue()))
  const [periodEnd, setPeriodEnd] = useState(lastDayOfMonth(currentMonthValue()))
  const { buckets, weeks, loading: weeksLoading, error: weeksError, saveWeek } = useWeeklySpending(
    user?.id,
    selectedMonth,
    periodStart,
    periodEnd,
  )
  const {
    activeCosts: fixedCosts,
    total: fixedCostsTotal,
    loading: fixedCostsLoading,
    addCost: addFixedCost,
    updateCost: updateFixedCost,
    endCost: endFixedCost,
  } = useFixedCosts(user?.id, selectedMonth)
  const { pots, loading: potsLoading } = useSavingsPots(user?.id)
  const { categories: categoryRows, loading: categoriesLoading } = useSpendingCategories(user?.id)
  const categories = useMemo(() => categoryRows.map((c) => c.name), [categoryRows])

  // True only when the user has actually typed into a payday input since
  // the last save -- see the payday-sync effect below for why this exists.
  const periodEditedRef = useRef(false)

  const [form, setForm] = useState(emptyForm())
  const [closingBalances, setClosingBalances] = useState({})
  const [actualSplit, setActualSplit] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [weekSaveError, setWeekSaveError] = useState(null)

  const existingEntry = useMemo(
    () => entries.find((e) => dateToMonthValue(e.month) === selectedMonth),
    [entries, selectedMonth],
  )

  useEffect(() => {
    if (existingEntry) {
      setForm({
        income: existingEntry.income ?? 0,
        notes: existingEntry.notes ?? '',
      })
      setClosingBalances({ ...emptyClosingBalances(pots), ...existingEntry.account_balances })
    } else {
      setForm(emptyForm())
      setClosingBalances(latestClosingBalances(entries, pots, selectedMonth))
    }
    setActualSplit({ ...emptyGoalSplit(pots), ...existingEntry?.goal_contributions })
    setPeriodStart(existingEntry?.period_start ?? monthValueToDate(selectedMonth))
    setPeriodEnd(existingEntry?.period_end ?? lastDayOfMonth(selectedMonth))
    periodEditedRef.current = false
    setSaved(false)
    setSaveError(null)
    // Keyed on the entry's id, not the entry object or the entries array --
    // those get a new reference on every refetch (including ones triggered
    // by totally unrelated saves, like the fixedCostsTotal sync below),
    // which would otherwise re-run this and stomp on an in-progress payday
    // edit before it's had a chance to save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, existingEntry?.id, pots])

  // Keeps a saved month's payday dates in sync as soon as they're edited,
  // the same way fixedCostsTotal below syncs itself -- no separate save step.
  // Gated on periodEditedRef (set only by the actual input's onChange), not
  // on comparing periodStart/periodEnd against existingEntry's stored
  // values -- that comparison raced with the effect above: when existingEntry
  // first loads, both effects fire in the same commit, and this one would
  // read periodEnd from *this render's* stale closure (still the pre-load
  // default) while existingEntry already reflected the freshly-loaded value,
  // making a load look like an edit and saving the stale default over the
  // real one. A dirty flag set only by genuine user input sidesteps that
  // entirely, regardless of effect ordering.
  //
  // Only period_start/period_end are sent: saveEntry upserts, and Postgres'
  // ON CONFLICT DO UPDATE only touches columns actually present in the
  // payload, so every other field is left exactly as it is in the database.
  useEffect(() => {
    if (!existingEntry || !periodEditedRef.current) return
    periodEditedRef.current = false

    saveEntry({
      id: existingEntry.id,
      month: existingEntry.month,
      period_start: periodStart,
      period_end: periodEnd,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStart, periodEnd, existingEntry])

  const weeksByStart = useMemo(
    () => Object.fromEntries(weeks.map((w) => [w.week_start, w])),
    [weeks],
  )

  const weeklyTotal = useMemo(() => {
    const totals = aggregateWeeklySpending(weeks)
    return Object.values(totals).reduce((t, v) => t + v, 0)
  }, [weeks])

  const totalSpending = weeklyTotal + fixedCostsTotal
  const saved_ = (Number(form.income) || 0) - totalSpending

  // Keeps the already-saved month's spending total in sync whenever the
  // fixed costs list changes, without needing a separate save action.
  useEffect(() => {
    // Wait until fixed costs have actually finished loading — otherwise
    // fixedCostsTotal briefly reads as 0 on first mount and this would fire
    // a spurious save that wipes the real total.
    if (!existingEntry || fixedCostsLoading) return
    const storedFixed = Number(existingEntry.spending?.[FIXED_COSTS_CATEGORY]) || 0
    if (storedFixed === fixedCostsTotal) return

    // Only id/month/spending -- see the comment on the payday-sync effect
    // above for why every other field, including period_start/period_end,
    // is deliberately left out of this payload.
    saveEntry({
      id: existingEntry.id,
      month: existingEntry.month,
      spending: { ...existingEntry.spending, [FIXED_COSTS_CATEGORY]: fixedCostsTotal },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedCostsTotal, fixedCostsLoading, existingEntry])

  // Saving a week only touches weekly_spending + the aggregate spending total
  // synced onto monthly_entries — it never overwrites income/balances/notes
  // with whatever's currently sitting in the form (those need "Update month").
  const handleWeekSave = async (weekStart, weekEnd, spendingForWeek) => {
    setWeekSaveError(null)
    try {
      await saveWeek(weekStart, weekEnd, spendingForWeek)
      const updatedWeeks = [
        ...weeks.filter((w) => w.week_start !== weekStart),
        { week_start: weekStart, spending: spendingForWeek },
      ]
      const totals = { ...aggregateWeeklySpending(updatedWeeks), [FIXED_COSTS_CATEGORY]: fixedCostsTotal }

      await saveEntry({
        ...(existingEntry ? { id: existingEntry.id } : {}),
        month: monthValueToDate(selectedMonth),
        income: existingEntry?.income ?? 0,
        spending: totals,
        account_balances: existingEntry?.account_balances ?? latestClosingBalances(entries, pots, selectedMonth),
        goal_contributions: existingEntry?.goal_contributions ?? {},
        house_contribution_me: existingEntry?.house_contribution_me ?? 0,
        house_contribution_partner: existingEntry?.house_contribution_partner ?? 0,
        notes: existingEntry?.notes ?? '',
        period_start: periodStart,
        period_end: periodEnd,
      })
    } catch (err) {
      setWeekSaveError(err.message)
      throw err
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      await saveEntry({
        ...(existingEntry ? { id: existingEntry.id } : {}),
        month: monthValueToDate(selectedMonth),
        income: Number(form.income) || 0,
        spending: existingEntry?.spending ?? {},
        account_balances: Object.fromEntries(
          pots.map((p) => [p.id, Number(closingBalances[p.id]) || 0]),
        ),
        goal_contributions: Object.fromEntries(
          pots.map((p) => [p.id, Number(actualSplit[p.id]) || 0]),
        ),
        house_contribution_me: existingEntry?.house_contribution_me ?? 0,
        house_contribution_partner: existingEntry?.house_contribution_partner ?? 0,
        notes: form.notes,
        period_start: periodStart,
        period_end: periodEnd,
      })
      setSaved(true)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existingEntry) return
    if (!window.confirm(`Delete the entry for ${formatMonthYear(existingEntry.month)}?`)) return
    await deleteEntry(existingEntry.id)
  }

  const dataLoading = potsLoading || categoriesLoading

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Monthly Data Entry</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Enter your figures for a month to update the dashboard.</p>
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Month</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400"
          />
        </label>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-300 dark:border-red-500/30 bg-red-100 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Couldn't load existing entries: {error}
        </p>
      )}

      {dataLoading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading your setup…</p>
      ) : (
        <>
          <FixedCostsCard
            costs={fixedCosts}
            total={fixedCostsTotal}
            addCost={addFixedCost}
            updateCost={updateFixedCost}
            onRemove={endFixedCost}
            removeLabel={`Remove from ${formatMonthYear(monthValueToDate(selectedMonth))}`}
            showRange
            description="Recurring costs like rent, subscriptions, or council tax. Adding one here applies it from this month onward and leaves earlier months untouched. Removing it stops it from this month onward too."
            emptyLabel="No fixed costs for this month yet."
          />

          <Card title="Weekly Spending" className="mb-5">
            <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
              Log spending week by week. No need to wait until the month's over.
            </p>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="text-sm">
                <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Payday from</span>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => {
                    periodEditedRef.current = true
                    setPeriodStart(e.target.value)
                  }}
                  className="min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Payday to</span>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => {
                    periodEditedRef.current = true
                    setPeriodEnd(e.target.value)
                  }}
                  className="min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400"
                />
              </label>
            </div>
            {weeksError && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{weeksError}</p>}
            {weekSaveError && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{weekSaveError}</p>}
            {weeksLoading ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No spending categories yet. Add some in Settings first.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
                {buckets.map((bucket) => (
                  <WeekEntryRow
                    key={bucket.weekStart}
                    weekStart={bucket.weekStart}
                    weekEnd={bucket.weekEnd}
                    categories={categories}
                    initialSpending={weeksByStart[bucket.weekStart]?.spending}
                    onSave={handleWeekSave}
                  />
                ))}
              </ul>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-zinc-200 dark:border-white/10 pt-4 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Weekly spending total</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatGBP(weeklyTotal)}</span>
            </div>
          </Card>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Card title="Income">
              <NumberField
                id="income"
                label="Income"
                value={form.income}
                onChange={(v) => setForm((prev) => ({ ...prev, income: v }))}
              />
              <div className="mt-4 flex flex-col gap-2 border-t border-zinc-200 dark:border-white/10 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Total spent (weekly + fixed costs)</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatGBP(totalSpending)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Saved this month</span>
                  <span className={`font-medium ${saved_ >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatGBP(saved_)}
                  </span>
                </div>
              </div>
            </Card>

            {pots.length > 0 && (
              <Card title="Pot Closing Balances (end of month)">
                <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                  Enter each pot's real closing balance from wherever it's held. This drives Total Savings and
                  the Goal Tracker, so growth or loss shows up automatically.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {pots.map((pot) => (
                    <NumberField
                      key={pot.id}
                      id={`closing-${pot.id}`}
                      label={pot.name}
                      value={closingBalances[pot.id] ?? 0}
                      onChange={(v) => setClosingBalances((prev) => ({ ...prev, [pot.id]: v }))}
                    />
                  ))}
                </div>
              </Card>
            )}

            {pots.length === 0 ? (
              <Card title="Savings Split">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No savings pots yet. Add some in Settings first.
                </p>
              </Card>
            ) : (
              <>
                <Card title="Savings Split (guide)">
                  <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                    Whatever's left after spending ({formatGBP(saved_)}) would split like this. It's a guide,
                    not what actually happened.
                  </p>
                  <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
                    {pots.map((pot) => (
                      <li key={pot.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {pot.name} <span className="text-xs text-zinc-500 dark:text-zinc-400">({Math.round(pot.percentage * 100)}%)</span>
                        </span>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {formatGBP(Math.max(0, saved_) * pot.percentage)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card title="Actual Savings Split">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      At the end of the month, enter what actually went into each pot. This feeds the
                      Contributions total on your dashboard. It doesn't affect the pot's balance, which comes
                      from the closing balance above.
                    </p>
                    <motion.button {...tapScale}
                      type="button"
                      onClick={() =>
                        setActualSplit(
                          Object.fromEntries(
                            pots.map((p) => [p.id, Math.round(Math.max(0, saved_) * p.percentage)]),
                          ),
                        )
                      }
                      className="min-h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-lg border border-pink-300 dark:border-emerald-500/40 px-3 text-sm font-medium text-pink-700 dark:text-emerald-400 transition-colors duration-150 hover:bg-pink-100 dark:hover:bg-emerald-500/10"
                    >
                      Copy guide amounts
                    </motion.button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {pots.map((pot) => (
                      <NumberField
                        key={pot.id}
                        id={`actual-${pot.id}`}
                        label={pot.name}
                        value={actualSplit[pot.id] ?? 0}
                        onChange={(v) => setActualSplit((prev) => ({ ...prev, [pot.id]: v }))}
                      />
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-zinc-200 dark:border-white/10 pt-4 text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Total actually saved</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {formatGBP(Object.values(actualSplit).reduce((t, v) => t + (Number(v) || 0), 0))}
                    </span>
                  </div>
                </Card>
              </>
            )}

            <Card title="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g. Stayed £150 under food budget, shopping increased by £200..."
                rows={3}
                className="w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400"
              />
            </Card>

            {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
            {saved && <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved {formatMonthYear(monthValueToDate(selectedMonth))}.</p>}

            <div className="flex flex-wrap items-center gap-3">
              <motion.button {...tapScale}
                type="submit"
                disabled={saving || loading}
                className="min-h-11 cursor-pointer rounded-lg bg-pink-600 dark:bg-emerald-400 px-5 py-2.5 text-sm font-medium text-white dark:text-zinc-950 transition-colors duration-150 hover:bg-pink-500 dark:hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : existingEntry ? 'Update month' : 'Save month'}
              </motion.button>
              {existingEntry && (
                <motion.button {...tapScale}
                  type="button"
                  onClick={handleDelete}
                  className="min-h-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-red-600 dark:text-red-400 transition-colors duration-150 hover:bg-red-100 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                >
                  Delete this month's entry
                </motion.button>
              )}
            </div>
          </form>
        </>
      )}

      <div className="mt-8">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Past entries</h3>
        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No entries yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-white/10 rounded-xl border border-zinc-200 dark:border-white/10">
            {[...entries].reverse().map((e) => (
              <li key={e.id} className="flex items-center justify-between py-1 pl-4 pr-2 text-sm">
                <span className="text-zinc-800 dark:text-zinc-200">{formatMonthYear(e.month)}</span>
                <motion.button {...tapScale}
                  type="button"
                  onClick={() => setSelectedMonth(dateToMonthValue(e.month))}
                  className="min-h-11 cursor-pointer rounded-lg px-3 font-medium text-pink-600 dark:text-emerald-400 transition-colors duration-150 hover:bg-pink-100 dark:hover:bg-emerald-500/10 hover:text-pink-700 dark:hover:text-emerald-400"
                >
                  Edit
                </motion.button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
