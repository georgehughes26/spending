import Card from './Card'
import ProgressBar from './ProgressBar'
import { formatGBP, formatMonthYear } from '../utils/format'

export default function HouseGoalCard({ goal }) {
  const {
    propertyTarget,
    depositTarget,
    currentDeposit,
    expectedPurchaseDate,
    myContribution,
    partnerContribution,
  } = goal

  const progress = (currentDeposit / depositTarget) * 100
  const combined = myContribution + partnerContribution

  return (
    <Card title="House Purchase Progress">
      <div className="mb-1 text-lg font-semibold text-zinc-50">
        {formatGBP(propertyTarget)} property
      </div>
      <div className="mb-3 text-sm text-zinc-400">
        Deposit target {formatGBP(depositTarget)}
      </div>

      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-2xl font-semibold text-zinc-50">{formatGBP(currentDeposit)}</span>
        <span className="text-sm font-medium text-pink-400">{progress.toFixed(1)}%</span>
      </div>
      <ProgressBar value={progress} className="mb-4" />

      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="text-zinc-400">Estimated purchase</span>
        <span className="font-medium text-zinc-100">{formatMonthYear(expectedPurchaseDate)}</span>
      </div>

      <dl className="grid grid-cols-3 gap-2 border-t border-zinc-800 pt-4 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Me</dt>
          <dd className="mt-1 font-medium text-zinc-100">{formatGBP(myContribution)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Partner</dt>
          <dd className="mt-1 font-medium text-zinc-100">{formatGBP(partnerContribution)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Combined</dt>
          <dd className="mt-1 font-medium text-zinc-50">{formatGBP(combined)}</dd>
        </div>
      </dl>
    </Card>
  )
}
