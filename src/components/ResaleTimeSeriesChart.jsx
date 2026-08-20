import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from './Card'
import { useAuth } from '../context/AuthContext'
import { formatGBP } from '../utils/format'

const GRANULARITIES = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
]

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const rows = [
    { label: 'Total Cost', value: point.totalCost, tone: 'text-zinc-900 dark:text-zinc-100' },
    { label: 'Total Sales', value: point.totalSales, tone: 'text-zinc-900 dark:text-zinc-100' },
    {
      label: 'Total Profit',
      value: point.totalProfit,
      tone: point.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      showSign: true,
    },
  ]
  return (
    <div className="rounded-lg border border-pink-200 dark:border-[var(--border-dark)] bg-white dark:bg-[var(--surface-dark)] px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-medium text-zinc-900 dark:text-zinc-100">{point.label}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 text-zinc-500 dark:text-zinc-400">
          <span>{r.label}</span>
          <span className={r.tone}>{formatGBP(r.value, { pence: true, showSign: r.showSign })}</span>
        </div>
      ))}
    </div>
  )
}

export default function ResaleTimeSeriesChart({ data, granularity, onGranularityChange }) {
  const { theme } = useAuth()
  const isDark = theme === 'dark'
  const axisColor = isDark ? '#a1a1aa' : '#71717a'
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : '#e4e4e7'
  const profitPositiveColor = isDark ? '#34d399' : '#db2777'
  const profitNegativeColor = isDark ? '#f87171' : '#dc2626'

  return (
    <Card title="Performance Over Time">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Costs land when you bought, sales land when you sold.</p>
        <div className="flex gap-2">
          {GRANULARITIES.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => onGranularityChange(g.value)}
              className={`min-h-11 cursor-pointer rounded-lg border px-3 text-sm font-medium transition-colors duration-150 ${
                granularity === g.value
                  ? 'border-pink-600 dark:border-emerald-400 bg-pink-600 dark:bg-emerald-400 text-white dark:text-zinc-950'
                  : 'border-zinc-300 dark:border-white/15 text-zinc-500 dark:text-zinc-400 hover:text-pink-700 dark:hover:text-emerald-400'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No stock activity in this view yet.</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={gridColor} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="totalProfit" name="Total Profit" radius={[4, 4, 4, 4]}>
                {data.map((d) => (
                  <Cell key={d.key} fill={d.totalProfit >= 0 ? profitPositiveColor : profitNegativeColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
