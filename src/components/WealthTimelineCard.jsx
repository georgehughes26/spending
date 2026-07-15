import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import Card from './Card'
import { formatGBP } from '../utils/format'

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
    <label className="block text-xs text-zinc-400">
      <div className="mb-1 flex justify-between">
        <span>{label}</span>
        <span className="font-medium text-zinc-200">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-pink-600"
      />
    </label>
  )
}

export default function WealthTimelineCard({ startingNetWorth, initialAssumptions }) {
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
          <div key={p.label} className="rounded-xl bg-zinc-800/60 py-3">
            <div className="text-xs text-zinc-500">{p.label}</div>
            <div className="mt-1 text-sm font-semibold text-zinc-50 sm:text-base">
              {formatGBP(p.value ?? 0)}
            </div>
          </div>
        ))}
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ec4899" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={{ stroke: '#3f3f46' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `£${Math.round(v / 1000)}k`}
              width={44}
            />
            <Tooltip
              contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
              labelStyle={{ color: '#a1a1aa' }}
              formatter={(value) => [formatGBP(value), 'Net worth']}
            />
            <Area type="monotone" dataKey="value" stroke="#ec4899" strokeWidth={2} fill="url(#netWorthFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <button
        type="button"
        onClick={() => setShowControls((s) => !s)}
        className="mt-4 cursor-pointer text-sm font-medium text-pink-400 transition-colors duration-150 hover:text-pink-300"
      >
        {showControls ? 'Hide assumptions' : 'Adjust assumptions'}
      </button>

      {showControls && (
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-zinc-800 pt-4 sm:grid-cols-2">
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
