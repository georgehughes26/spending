import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from './Card'
import { formatGBP } from '../utils/format'
import { formatMonthYear } from '../utils/format'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-pink-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="text-zinc-500">{formatMonthYear(point.month)}</div>
      <div className="font-medium text-zinc-900">{formatGBP(point.total)}</div>
    </div>
  )
}

export default function TotalSavingsCard({ goals, history = [] }) {
  const total = goals.reduce((t, g) => t + g.current, 0)

  return (
    <Card title="Total Savings">
      <div className="mb-4 text-3xl font-semibold text-zinc-900">{formatGBP(total)}</div>

      {history.length > 1 && (
        <div className="mb-5 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="totalSavingsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#db2777" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#db2777" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tickFormatter={(value) => new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(value))}
                tick={{ fontSize: 11, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#db2777"
                strokeWidth={2}
                fill="url(#totalSavingsFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <ul className="flex flex-col divide-y divide-zinc-200">
        {goals.map((goal) => {
          const share = total > 0 ? Math.round((goal.current / total) * 100) : 0
          return (
            <li key={goal.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-zinc-700">
                {goal.name} <span className="text-xs text-zinc-500">({share}%)</span>
              </span>
              <span className="font-medium text-zinc-900">{formatGBP(goal.current)}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
