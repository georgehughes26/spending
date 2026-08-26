import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import Card from './Card'
import { AnimatedNumber, tapScale } from './motion'
import { useAuth } from '../context/AuthContext'
import { formatGBP } from '../utils/format'
import { motion } from 'framer-motion'

const HORIZON_MONTHS = 36

function projectNetWorth(startingNetWorth, assumptions) {
  const {
    monthlySavings,
    investmentContribution,
    pensionContribution,
    investmentGrowthRate,
    pensionGrowthRate,
  } = assumptions

  const monthlyInvestmentGrowth = investmentGrowthRate / 12
  const monthlyPensionGrowth = pensionGrowthRate / 12

  let cash = startingNetWorth
  let investmentGrowthBonus = 0
  let pensionGrowthBonus = 0

  const points = [{ month: 0, label: 'Today', value: Math.round(startingNetWorth) }]

  for (let m = 1; m <= HORIZON_MONTHS; m++) {
    cash += monthlySavings
    investmentGrowthBonus = (investmentGrowthBonus + investmentContribution) * (1 + monthlyInvestmentGrowth)
    pensionGrowthBonus = (pensionGrowthBonus + pensionContribution) * (1 + monthlyPensionGrowth)

    const value = cash + investmentGrowthBonus + pensionGrowthBonus
    if (m % 3 === 0 || m === HORIZON_MONTHS) {
      points.push({ month: m, label: `${m}mo`, value: Math.round(value) })
    }
  }

  return points
}

function SliderField({ label, value, min, max, step, onChange, format }) {
  return (
    <label className="block text-xs text-zinc-500 dark:text-zinc-400">
      <div className="mb-1 flex justify-between">
        <span>{label}</span>
        <span className="font-medium text-zinc-700 dark:text-zinc-200">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-pink-600 dark:accent-emerald-400"
      />
    </label>
  )
}

export default function WealthTimelineCard({ startingNetWorth, initialAssumptions }) {
  const { theme } = useAuth()
  const accent = theme === 'dark' ? '#34d399' : '#db2777'
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e4e4e7'
  const axisColor = theme === 'dark' ? '#a1a1aa' : '#71717a'
  const [assumptions, setAssumptions] = useState(initialAssumptions)
  const [showControls, setShowControls] = useState(false)

  const data = useMemo(
    () => projectNetWorth(startingNetWorth, assumptions),
    [startingNetWorth, assumptions],
  )

  const at12 = data.find((d) => d.month === 12)
  const at24 = data.find((d) => d.month === 24)
  const at36 = data.find((d) => d.month === 36)

  const update = (key) => (value) => setAssumptions((prev) => ({ ...prev, [key]: value }))

  return (
    <Card title="Wealth Growth Timeline">
      <div className="mb-4 grid grid-cols-4 gap-3 text-center">
        {[
          { label: 'Today', value: startingNetWorth },
          { label: '12 months', value: at12?.value },
          { label: '24 months', value: at24?.value },
          { label: '36 months', value: at36?.value },
        ].map((p) => (
          <div key={p.label} className="rounded-xl bg-zinc-100 dark:bg-white/5 py-3">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{p.label}</div>
            <AnimatedNumber
              value={p.value ?? 0}
              className="mt-1 block text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 sm:text-base"
            />
          </div>
        ))}
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: axisColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: axisColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `£${Math.round(v / 1000)}k`}
              width={44}
            />
            <Tooltip
              contentStyle={{
                background: theme === 'dark' ? 'var(--surface-dark)' : '#ffffff',
                border: `1px solid ${theme === 'dark' ? 'var(--border-dark)' : '#fbcfe8'}`,
                borderRadius: 8,
              }}
              labelStyle={{ color: axisColor }}
              formatter={(value) => [formatGBP(value), 'Net worth']}
            />
            <Area type="monotone" dataKey="value" stroke={accent} strokeWidth={2} fill="url(#netWorthFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <motion.button {...tapScale}
        type="button"
        onClick={() => setShowControls((s) => !s)}
        className="mt-4 cursor-pointer text-sm font-medium text-pink-600 dark:text-emerald-400 transition-colors duration-150 hover:text-pink-700 dark:hover:text-emerald-300"
      >
        {showControls ? 'Hide assumptions' : 'Adjust assumptions'}
      </motion.button>

      {showControls && (
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-zinc-200 dark:border-white/10 pt-4 sm:grid-cols-2">
          <SliderField
            label="Monthly savings"
            value={assumptions.monthlySavings}
            min={0}
            max={2000}
            step={50}
            onChange={update('monthlySavings')}
            format={(v) => formatGBP(v)}
          />
          <SliderField
            label="Investment contribution"
            value={assumptions.investmentContribution}
            min={0}
            max={1000}
            step={25}
            onChange={update('investmentContribution')}
            format={(v) => formatGBP(v)}
          />
          <SliderField
            label="Pension contribution"
            value={assumptions.pensionContribution}
            min={0}
            max={1000}
            step={25}
            onChange={update('pensionContribution')}
            format={(v) => formatGBP(v)}
          />
          <SliderField
            label="Investment growth (annual)"
            value={assumptions.investmentGrowthRate}
            min={0}
            max={0.15}
            step={0.005}
            onChange={update('investmentGrowthRate')}
            format={(v) => `${(v * 100).toFixed(1)}%`}
          />
          <SliderField
            label="Pension growth (annual)"
            value={assumptions.pensionGrowthRate}
            min={0}
            max={0.15}
            step={0.005}
            onChange={update('pensionGrowthRate')}
            format={(v) => `${(v * 100).toFixed(1)}%`}
          />
        </div>
      )}
    </Card>
  )
}
