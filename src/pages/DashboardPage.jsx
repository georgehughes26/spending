import MonthlyOverviewCard from '../components/MonthlyOverviewCard'
import TotalSavingsCard from '../components/TotalSavingsCard'
import SavingsGoalsCard from '../components/SavingsGoalsCard'
import ContributionsCard from '../components/ContributionsCard'
import NetWorthCard from '../components/NetWorthCard'
import { FadeInItem, FadeInStagger } from '../components/motion'
import { useAuth } from '../context/AuthContext'
import { useMonthlyEntries } from '../hooks/useMonthlyEntries'
import { useSavingsPots } from '../hooks/useSavingsPots'
import { useWeeklySpending } from '../hooks/useWeeklySpending'
import { LIABILITIES } from '../data/config'
import {
  deriveAssets,
  deriveContributions,
  deriveMonthlyComparison,
  deriveMonthlyOverview,
  deriveNetWorthChange,
  deriveNetWorthHistory,
  deriveSavingsGoals,
  deriveTotalSavingsHistory,
} from '../data/derive'

export default function DashboardPage() {
  const { user } = useAuth()
  const { entries, loading, error } = useMonthlyEntries(user?.id)
  const { pots, loading: potsLoading } = useSavingsPots(user?.id)

  const currentMonthValue = entries[entries.length - 1]?.month.slice(0, 7)
  const previousMonthValue = entries[entries.length - 2]?.month.slice(0, 7)
  const { weeks: currentWeeks } = useWeeklySpending(user?.id, currentMonthValue)
  const { weeks: previousWeeks } = useWeeklySpending(user?.id, previousMonthValue)

  if (loading || potsLoading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading your data…</p>
  }

  if (error) {
    return (
      <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-600 dark:text-red-400">
        Couldn't load your data: {error}
      </p>
    )
  }

  const monthlyOverview = deriveMonthlyOverview(entries)
  const monthlyComparison = deriveMonthlyComparison(currentWeeks, previousWeeks)
  const savingsGoals = deriveSavingsGoals(entries, pots)
  const contributions = deriveContributions(entries, pots)
  const savingsHistory = deriveTotalSavingsHistory(entries, pots)
  const assets = deriveAssets(entries, pots)
  const netWorthHistory = deriveNetWorthHistory(entries, pots)
  const netWorthChange = deriveNetWorthChange(netWorthHistory)

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      {entries.length === 0 && (
        <p className="mb-5 rounded-lg border border-pink-300 dark:border-emerald-500/40 bg-pink-100 dark:bg-emerald-500/10 px-4 py-3 text-sm text-pink-700 dark:text-emerald-400">
          No monthly entries yet. Figures below use your starting balances. Add your first month on the Data Entry page.
        </p>
      )}

      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem>
          <NetWorthCard assets={assets} liabilities={LIABILITIES} netWorthHistory={netWorthHistory} change={netWorthChange} />
        </FadeInItem>

        {/* A bento mix of spans instead of a uniform grid -- the fuller
            cards (overview, savings history) get more room than the
            lighter ones, so it reads as composed rather than tiled. */}
        <FadeInItem className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2"><MonthlyOverviewCard {...monthlyOverview} comparison={monthlyComparison} /></div>
          <SavingsGoalsCard goals={savingsGoals} />
          <ContributionsCard contributions={contributions} />
          <div className="lg:col-span-2"><TotalSavingsCard goals={savingsGoals} history={savingsHistory} /></div>
        </FadeInItem>
      </FadeInStagger>
    </main>
  )
}
