import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from './Card'
import { useAuth } from '../context/AuthContext'
import { formatGBP } from '../utils/format'
import { motion } from 'framer-motion'
import { tapScale } from './motion'

const GRANULARITIES = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
]

function BarValueLabel({ x, y, width, height, value, isDark }) {
  const positive = value >= 0
  const fill = positive ? (isDark ? '#34d399' : '#db2777') : isDark ? '#f87171' : '#dc2626'
  const label = formatGBP(value, { pence: true, showSign: true })
  // Recharts gives negative bars a negative height, with y as the *bottom*
  // edge (farthest from zero) rather than the top -- min/max sorts that out
  // so positive bars label above their top and negative bars label below
  // their bottom, regardless of which edge y actually points at.
  const top = Math.min(y, y + height)
  const bottom = Math.max(y, y + height)
  const labelY = positive ? top - 8 : bottom + 14
  return (
    <text x={x + width / 2} y={labelY} textAnchor="middle" fontSize={12} fontWeight={600} fill={fill}>
      {label}
    </text>
  )
}

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

// A lone small loss next to a big win would otherwise get squeezed into a
// sliver right at the zero line -- its value label (drawn below the bar)
// would then collide with the week/month labels underneath the chart. The
// negative side of the domain is floored to a fixed share of the positive
// side so a negative bar always has real height to draw its label under,
// regardless of how it compares to the other bars.
function profitDomain(data) {
  const profits = data.map((d) => d.totalProfit)
  const maxProfit = Math.max(0, ...profits)
  const minProfit = Math.min(0, ...profits)
  const domainMax = maxProfit > 0 ? maxProfit * 1.15 : 1
  const domainMin = minProfit < 0 ? -Math.max(Math.abs(minProfit) * 1.3, domainMax * 0.2) : 0
  return [domainMin, domainMax]
}

export default function ResaleTimeSeriesChart({ data, granularity, onGranularityChange }) {
  const { theme } = useAuth()
  const isDark = theme === 'dark'
  const axisColor = isDark ? '#a1a1aa' : '#71717a'
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : '#e4e4e7'
  const profitPositiveColor = isDark ? '#34d399' : '#db2777'
  const profitNegativeColor = isDark ? '#f87171' : '#dc2626'
  const yDomain = profitDomain(data)

  return (
    <Card title="Performance Over Time">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">A sale's cost and revenue land together once it's completed.</p>
        <div className="flex gap-2">
          {GRANULARITIES.map((g) => (
            <motion.button {...tapScale}
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
            </motion.button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No stock activity in this view yet.</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 24, right: 8, bottom: 16, left: 8 }}>
              <CartesianGrid stroke={gridColor} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fontWeight: 500, fill: axisColor }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis hide domain={yDomain} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="totalProfit" name="Total Profit" radius={[8, 8, 8, 8]} maxBarSize={data.length <= 4 ? 88 : 56}>
                {data.map((d) => (
                  <Cell key={d.key} fill={d.totalProfit >= 0 ? profitPositiveColor : profitNegativeColor} />
                ))}
                <LabelList dataKey="totalProfit" content={(props) => <BarValueLabel {...props} isDark={isDark} />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
