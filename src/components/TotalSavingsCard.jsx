import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from './Card'
import { useAuth } from '../context/AuthContext'
import { formatGBP } from '../utils/format'
import { formatMonthYear } from '../utils/format'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-pink-200 dark:border-[var(--border-dark)] bg-white dark:bg-[var(--surface-dark)] px-3 py-2 text-xs shadow-sm">
      <div className="text-zinc-500 dark:text-zinc-400">{formatMonthYear(point.month)}</div>
      <div className="font-medium text-zinc-900 dark:text-zinc-100">{formatGBP(point.total)}</div>
    </div>
  )
}

export default function TotalSavingsCard({ goals, history = [] }) {
  const { theme } = useAuth()
  const accent = theme === 'dark' ? '#34d399' : '#db2777'
  const axisColor = theme === 'dark' ? '#a1a1aa' : '#71717a'
  const total = goals.reduce((t, g) => t + g.current, 0)
  const chartData = history.length > 0 ? history : [{ month: new Date().toISOString(), total }]

  return (
    <Card title="Total Savings">
      <div className="mb-4 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">{formatGBP(total)}</div>

      <div className="mb-5 h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="totalSavingsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tickFormatter={(value) => new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(value))}
              tick={{ fontSize: 11, fill: axisColor }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="total"
              stroke={accent}
              strokeWidth={2}
              fill="url(#totalSavingsFill)"
              dot={{ r: 3, fill: accent, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
        {goals.map((goal) => {
          const share = total > 0 ? Math.round((goal.current / total) * 100) : 0
          return (
            <li key={goal.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">
                {goal.name} <span className="text-xs text-zinc-500 dark:text-zinc-400">({share}%)</span>
              </span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatGBP(goal.current)}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
