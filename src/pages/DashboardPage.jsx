import MonthlyOverviewCard from '../components/MonthlyOverviewCard'
import TotalSavingsCard from '../components/TotalSavingsCard'
import SavingsGoalsCard from '../components/SavingsGoalsCard'
import { useAuth } from '../context/AuthContext'
import { useMonthlyEntries } from '../hooks/useMonthlyEntries'
import { useSavingsPots } from '../hooks/useSavingsPots'
import { deriveMonthlyOverview, deriveSavingsGoals } from '../data/derive'

export default function DashboardPage() {
  const { user } = useAuth()
  const { entries, loading, error } = useMonthlyEntries(user?.id)
  const { pots, loading: potsLoading } = useSavingsPots(user?.id)

  if (loading || potsLoading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500">Loading your data…</p>
  }

  if (error) {
    return (
      <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-300">
        Couldn't load your data: {error}
      </p>
    )
  }

  const monthlyOverview = deriveMonthlyOverview(entries)
  const savingsGoals = deriveSavingsGoals(entries, pots)

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      {entries.length === 0 && (
        <p className="mb-5 rounded-lg border border-pink-900/40 bg-pink-950/20 px-4 py-3 text-sm text-pink-300">
          No monthly entries yet — figures below use your starting balances. Add your first month on the Data Entry page.
        </p>
      )}

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MonthlyOverviewCard {...monthlyOverview} />
        <TotalSavingsCard goals={savingsGoals} />
      </section>

      <section className="mt-5">
        <SavingsGoalsCard goals={savingsGoals} />
      </section>
    </main>
  )
}
