import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useTrainingData } from '../hooks/useTrainingData'
import { FadeInItem, FadeInStagger, tapScale } from '../components/motion'
import Card from '../components/Card'
import OnTrackBadge from '../components/training/OnTrackBadge'
import WeightChart from '../components/training/WeightChart'
import CheckInExportButton from '../components/training/CheckInExportButton'
import TrainingSubNav from '../components/training/TrainingSubNav'
import { weekTotals } from '../lib/habits/checkin'
import { trendWeight, goalLineWeight, onTrackStatus } from '../lib/habits/goalLine'
import { addDays, formatShortDay, weekDatesFor, weekNumberFor, totalWeeksFor, weekStartFor, todayISODate } from '../lib/habits/dates'

export default function TrainingWeekPage() {
  const { weekStart: weekStartParam } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const today = todayISODate()
  // "the last full week when it's Monday" -- otherwise the week in progress.
  const defaultWeekStart = new Date(`${today}T00:00:00Z`).getUTCDay() === 1 ? addDays(weekStartFor(today), -7) : weekStartFor(today)
  const weekStart = weekStartParam ?? defaultWeekStart
  const t = useTrainingData(user?.id)

  if (t.loading) {
    return <p className="mx-auto max-w-2xl px-5 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading your training data…</p>
  }
  if (t.error || !t.settings) {
    return (
      <p className="mx-auto max-w-2xl px-5 py-6 text-sm text-red-600 dark:text-red-400">
        Couldn't load your training data{t.error ? `: ${t.error}` : ''}. If this says a table is missing, the habit-tracker
        migration (supabase/migration_habit_tracker.sql) needs to be run in the Supabase SQL editor first.
      </p>
    )
  }

  const { settings, template, weekPlans, dailyLogsByDate } = t
  const dates = weekDatesFor(weekStart)
  const weekEnd = dates[6]
  const plan = weekPlans.find((p) => p.week_start === weekStart)

  const trend = trendWeight(weekEnd, dailyLogsByDate)
  const prevTrend = trendWeight(addDays(weekStart, -1), dailyLogsByDate)
  const change = trend != null && prevTrend != null ? trend - prevTrend : null
  const goalLine = goalLineWeight(weekEnd, settings)
  const track = onTrackStatus(trend, goalLine)

  const totals = weekTotals(dates, weekPlans, template, dailyLogsByDate, settings)
  const weekNum = weekNumberFor(weekStart, settings.plan_start)
  const totalWeeks = totalWeeksFor(settings.plan_start, settings.goal_date)

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-10">
      <TrainingSubNav />
      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem className="flex items-center justify-between">
          <motion.button {...tapScale} type="button" onClick={() => navigate(`/training/week/${addDays(weekStart, -7)}`)} className="min-h-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10">
            ← Prev
          </motion.button>
          <div className="text-center">
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Week {weekNum} of {totalWeeks}</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatShortDay(dates[0])} – {formatShortDay(dates[6])}</p>
          </div>
          <motion.button {...tapScale} type="button" onClick={() => navigate(`/training/week/${addDays(weekStart, 7)}`)} className="min-h-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10">
            Next →
          </motion.button>
        </FadeInItem>

        {plan?.summary && (
          <FadeInItem className="flex items-start justify-between gap-3 rounded-xl bg-pink-50 p-3 text-sm text-pink-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span>{plan.summary}</span>
            <motion.button
              {...tapScale}
              type="button"
              onClick={async () => { if (confirm('Revert this week to the default template?')) await t.revertWeekPlan(weekStart) }}
              className="shrink-0 cursor-pointer whitespace-nowrap text-xs font-medium underline"
            >
              Revert to default
            </motion.button>
          </FadeInItem>
        )}

        <FadeInItem>
          <CheckInExportButton
            className="w-full"
            weekStart={weekStart}
            settings={settings}
            template={template}
            weekPlans={weekPlans}
            dailyLogsByDate={dailyLogsByDate}
          />
        </FadeInItem>

        <FadeInItem>
          <Card title="Weight">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{trend != null ? `${trend.toFixed(1)}kg` : '—'}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  7-day trend{change != null && <> · {change >= 0 ? '+' : ''}{change.toFixed(1)}kg vs last week</>}
                </div>
              </div>
              <OnTrackBadge track={track} />
            </div>
            <WeightChart settings={settings} dailyLogsByDate={dailyLogsByDate} />
          </Card>
        </FadeInItem>

        <FadeInItem>
          <Card title="This week">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Stat label="Protein hit" value={`${totals.proteinHit}/7`} />
              <Stat label="Sessions" value={`${totals.sessionsDone}/${totals.sessionsPlanned}`} />
              <Stat label="Steps hit" value={`${totals.stepsHit}/7`} />
              <Stat label="Water hit" value={`${totals.waterHit}/7`} />
              <Stat label="Creatine" value={`${totals.creatine}/7`} />
              <Stat label="Vitamin D" value={`${totals.vitD}/7`} />
              <Stat label="Avg calories" value={totals.avgCalories != null ? Math.round(totals.avgCalories).toLocaleString('en-GB') : '—'} />
              <Stat label="Avg steps" value={totals.avgSteps != null ? Math.round(totals.avgSteps).toLocaleString('en-GB') : '—'} />
              <Stat label="Total drinks" value={totals.drinksTotal} />
            </dl>
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Calories: under {totals.under}, on target {totals.on}, over {totals.over} day(s).
              {totals.missedSessions.length > 0 && <> Missed: {totals.missedSessions.join(', ')}.</>}
            </p>
          </Card>
        </FadeInItem>
      </FadeInStagger>
    </main>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  )
}
