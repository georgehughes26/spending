import MonthlyOverviewCard from '../components/MonthlyOverviewCard'
import TotalSavingsCard from '../components/TotalSavingsCard'
import SavingsGoalsCard from '../components/SavingsGoalsCard'
import ContributionsCard from '../components/ContributionsCard'
import { useAuth } from '../context/AuthContext'
import { useMonthlyEntries } from '../hooks/useMonthlyEntries'
import { useSavingsPots } from '../hooks/useSavingsPots'
import {
  deriveContributions,
  deriveMonthlyOverview,
  deriveSavingsGoals,
  deriveTotalSavingsHistory,
} from '../data/derive'

export default function DashboardPage() {
  const { user } = useAuth()
  const { entries, loading, error } = useMonthlyEntries(user?.id)
  const { pots, loading: potsLoading } = useSavingsPots(user?.id)

  if (loading || potsLoading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500">Loading your data…</p>
  }

  if (error) {
    return (
      <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-600">
        Couldn't load your data: {error}
      </p>
    )
  }

  const monthlyOverview = deriveMonthlyOverview(entries)
  const savingsGoals = deriveSavingsGoals(entries, pots)
  const contributions = deriveContributions(entries, pots)
  const savingsHistory = deriveTotalSavingsHistory(entries, pots)

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      {entries.length === 0 && (
        <p className="mb-5 rounded-lg border border-pink-300 bg-pink-100 px-4 py-3 text-sm text-pink-700">
          No monthly entries yet. Figures below use your starting balances. Add your first month on the Data Entry page.
        </p>
      )}

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MonthlyOverviewCard {...monthlyOverview} />
        <TotalSavingsCard goals={savingsGoals} history={savingsHistory} />
      </section>

      <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SavingsGoalsCard goals={savingsGoals} />
        <ContributionsCard contributions={contributions} />
      </section>
    </main>
  )
}
