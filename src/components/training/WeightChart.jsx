import { Line, ComposedChart, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../context/AuthContext'
import { formatShortDay } from '../../lib/habits/dates'
import { trendWeight, goalLineWeight } from '../../lib/habits/goalLine'
import { weekDatesFor, addDays } from '../../lib/habits/dates'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-pink-200 dark:border-[var(--border-dark)] bg-white dark:bg-[var(--surface-dark)] px-3 py-2 text-xs shadow-sm">
      <div className="text-zinc-500 dark:text-zinc-400">{formatShortDay(point.date)}</div>
      {point.weight != null && <div className="font-medium text-zinc-900 dark:text-zinc-100">Weight: {point.weight.toFixed(1)}kg</div>}
      {point.trend != null && <div className="text-pink-600 dark:text-emerald-400">Trend: {point.trend.toFixed(1)}kg</div>}
      <div className="text-zinc-400">Goal line: {point.goal.toFixed(1)}kg</div>
    </div>
  )
}

// Daily weigh-ins as dots, the 7-day rolling average as a line, and the
// straight goal line from start_weight to goal_weight across the whole plan.
export default function WeightChart({ settings, dailyLogsByDate }) {
  const { theme } = useAuth()
  const accent = theme === 'dark' ? '#34d399' : '#db2777'
  const axisColor = theme === 'dark' ? '#a1a1aa' : '#71717a'

  const dates = []
  for (let d = settings.plan_start; d <= settings.goal_date; d = addDays(d, 1)) dates.push(d)

  const data = dates.map((date) => ({
    date,
    weight: dailyLogsByDate[date]?.weight ?? null,
    trend: trendWeight(date, dailyLogsByDate),
    goal: goalLineWeight(date, settings),
  }))

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDay}
            tick={{ fontSize: 11, fill: axisColor }}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
          <Tooltip content={<ChartTooltip />} />
          <Line type="monotone" dataKey="goal" stroke={axisColor} strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="trend" stroke={accent} strokeWidth={2} dot={false} connectNulls />
          <Scatter dataKey="weight" fill={accent} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-1 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: accent }} /> Weigh-ins</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-3" style={{ background: accent }} /> Trend</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-3 border-t border-dashed" style={{ borderColor: axisColor }} /> Goal</span>
      </div>
    </div>
  )
}
