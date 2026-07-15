import { useMemo, useState } from 'react'
import Card from '../components/Card'
import { useBankData } from '../hooks/useBankData'
import { useMonthlyEntries } from '../hooks/useMonthlyEntries'
import { SPENDING_CATEGORIES } from '../data/config'
import { formatGBP, formatMonthYear } from '../utils/format'

function redirectUrl() {
  return `${window.location.origin}${window.location.pathname}#/bank-callback`
}

function monthKeyFromDate(dateString) {
  return dateString.slice(0, 7)
}

function groupSpendingByMonth(transactions) {
  const groups = {}
  for (const tx of transactions) {
    if (tx.amount >= 0 || !tx.category) continue
    const key = monthKeyFromDate(tx.booked_date)
    groups[key] ??= {}
    groups[key][tx.category] = (groups[key][tx.category] ?? 0) + Math.abs(tx.amount)
  }
  return groups
}

export default function BankPage() {
  const {
    connections,
    transactions,
    loading,
    error,
    listInstitutions,
    connectBank,
    syncTransactions,
    updateTransactionCategory,
  } = useBankData()
  const { entries, saveEntry } = useMonthlyEntries()

  const [showPicker, setShowPicker] = useState(false)
  const [institutions, setInstitutions] = useState([])
  const [institutionsLoading, setInstitutionsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [connectError, setConnectError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState(null)
  const [importMessage, setImportMessage] = useState(null)

  const openPicker = async () => {
    setShowPicker(true)
    setConnectError(null)
    setInstitutionsLoading(true)
    try {
      const list = await listInstitutions('GB')
      setInstitutions(Array.isArray(list) ? list : [])
    } catch (err) {
      setConnectError(err.message)
    } finally {
      setInstitutionsLoading(false)
    }
  }

  const handleConnect = async (institution) => {
    setConnectError(null)
    try {
      const { link } = await connectBank(institution, redirectUrl())
      window.location.href = link
    } catch (err) {
      setConnectError(err.message)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const result = await syncTransactions()
      setSyncMessage(`Synced ${result.synced} transactions across ${result.accounts} account(s).`)
    } catch (err) {
      setSyncMessage(`Sync failed: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const filteredInstitutions = institutions.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  )

  const uncategorized = transactions.filter((tx) => tx.amount < 0 && !tx.category)
  const spendingByMonth = useMemo(() => groupSpendingByMonth(transactions), [transactions])
  const monthKeys = Object.keys(spendingByMonth).sort().reverse()

  const importMonth = async (monthKey) => {
    setImportMessage(null)
    try {
      const existing = entries.find((e) => e.month.startsWith(monthKey))
      const baseSpending = Object.fromEntries(SPENDING_CATEGORIES.map((c) => [c, 0]))
      const mergedSpending = { ...baseSpending, ...existing?.spending, ...spendingByMonth[monthKey] }

      await saveEntry({
        ...(existing ? { id: existing.id } : {}),
        month: `${monthKey}-01`,
        income: existing?.income ?? 0,
        spending: mergedSpending,
        account_balances: existing?.account_balances ?? {},
        house_contribution_me: existing?.house_contribution_me ?? 0,
        house_contribution_partner: existing?.house_contribution_partner ?? 0,
        notes: existing?.notes ?? '',
      })
      setImportMessage(`Imported bank spending into ${formatMonthYear(`${monthKey}-01`)}.`)
    } catch (err) {
      setImportMessage(`Import failed: ${err.message}`)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-50">Bank Sync</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Connect your bank accounts to pull in spending automatically instead of typing it in each month.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <Card title="Connected Banks" className="mb-5">
        {connections.length === 0 && !showPicker && (
          <p className="mb-4 text-sm text-zinc-500">No banks connected yet.</p>
        )}
        {connections.length > 0 && (
          <ul className="mb-4 flex flex-col divide-y divide-zinc-800">
            {connections.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-zinc-200">{c.institution_name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.status === 'linked'
                      ? 'bg-emerald-950/40 text-emerald-400'
                      : c.status === 'pending'
                        ? 'bg-zinc-800 text-zinc-400'
                        : 'bg-red-950/40 text-red-300'
                  }`}
                >
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        )}

        {!showPicker ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openPicker}
              className="cursor-pointer rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-pink-500"
            >
              Connect a bank
            </button>
            {connections.some((c) => c.status === 'linked') && (
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="cursor-pointer rounded-lg border border-pink-900/40 px-4 py-2 text-sm font-medium text-pink-300 transition-colors duration-150 hover:bg-pink-950/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {syncing ? 'Syncing…' : 'Sync transactions'}
              </button>
            )}
          </div>
        ) : (
          <div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for your bank…"
              className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-pink-600"
            />
            {connectError && <p className="mb-3 text-sm text-red-400">{connectError}</p>}
            {institutionsLoading ? (
              <p className="text-sm text-zinc-500">Loading banks…</p>
            ) : (
              <ul className="max-h-72 overflow-y-auto rounded-lg border border-zinc-800">
                {filteredInstitutions.map((inst) => (
                  <li key={inst.id}>
                    <button
                      type="button"
                      onClick={() => handleConnect(inst)}
                      className="w-full cursor-pointer px-3 py-2 text-left text-sm text-zinc-200 transition-colors duration-150 hover:bg-zinc-800"
                    >
                      {inst.name}
                    </button>
                  </li>
                ))}
                {filteredInstitutions.length === 0 && (
                  <li className="px-3 py-2 text-sm text-zinc-500">No matches.</li>
                )}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="mt-3 cursor-pointer text-sm text-zinc-500 transition-colors duration-150 hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        )}

        {syncMessage && <p className="mt-3 text-sm text-zinc-400">{syncMessage}</p>}
      </Card>

      {monthKeys.length > 0 && (
        <Card title="Import Bank Spending into Monthly Entries" className="mb-5">
          {importMessage && <p className="mb-3 text-sm text-emerald-400">{importMessage}</p>}
          <ul className="flex flex-col divide-y divide-zinc-800">
            {monthKeys.map((key) => (
              <li key={key} className="flex items-center justify-between py-2 text-sm">
                <span className="text-zinc-200">{formatMonthYear(`${key}-01`)}</span>
                <button
                  type="button"
                  onClick={() => importMonth(key)}
                  className="cursor-pointer rounded-lg border border-pink-900/40 px-3 py-1.5 text-xs font-medium text-pink-300 transition-colors duration-150 hover:bg-pink-950/20"
                >
                  Import into Data Entry
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {uncategorized.length > 0 && (
        <Card title="Uncategorized Transactions" className="mb-5">
          <p className="mb-3 text-sm text-zinc-500">
            These didn't match a category rule — pick one so they count toward your monthly spending.
          </p>
          <ul className="flex flex-col divide-y divide-zinc-800">
            {uncategorized.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-zinc-200">{tx.description || 'Unknown'}</div>
                  <div className="text-xs text-zinc-500">{tx.booked_date}</div>
                </div>
                <span className="whitespace-nowrap font-medium text-red-300">{formatGBP(Math.abs(tx.amount))}</span>
                <select
                  value={tx.category ?? ''}
                  onChange={(e) => updateTransactionCategory(tx.id, e.target.value || null)}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-pink-600"
                >
                  <option value="">Choose…</option>
                  {SPENDING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Recent Transactions">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-zinc-500">No transactions synced yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-800">
            {transactions.slice(0, 50).map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-zinc-200">{tx.description || 'Unknown'}</div>
                  <div className="text-xs text-zinc-500">
                    {tx.booked_date} · {tx.bank_accounts?.display_name ?? 'Account'}
                    {tx.category ? ` · ${tx.category}` : ''}
                  </div>
                </div>
                <span className={`whitespace-nowrap font-medium ${tx.amount < 0 ? 'text-red-300' : 'text-emerald-400'}`}>
                  {formatGBP(Math.abs(tx.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
