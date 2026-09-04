import Card from './Card'
import { formatGBP } from '../utils/format'

const ICONS = {
  profit: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13l4-4 3 3 5-6" />
      <path d="M12 6h4v4" />
    </svg>
  ),
  roi: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="6.5" cy="6.5" r="1.6" />
      <circle cx="13.5" cy="13.5" r="1.6" />
      <path d="M14.5 5.5l-9 9" />
    </svg>
  ),
  price: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h5.5L16 10.5 10.5 16 4 9.5V4z" />
      <circle cx="7" cy="7" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  ),
  box: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6.5L10 3.5l6 3v7l-6 3-6-3v-7z" />
      <path d="M4 6.5l6 3 6-3" />
      <path d="M10 9.5v7" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" stroke="none">
      <path d="M10 2.5l2.1 4.4 4.9.6-3.6 3.4.9 4.8-4.3-2.3-4.3 2.3.9-4.8-3.6-3.4 4.9-.6z" />
    </svg>
  ),
  shirt: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3.5L4 6v3h2v7.5h8V9h2V6l-3-2.5-2 1.5-2-1.5z" />
    </svg>
  ),
}

// Comfortable, generously padded by default (mobile stacks this card alone
// with no height to match) -- lg: shrinks it back down since there the grid
// parent (auto-rows-fr) stretches every tile to fill its share of a height
// that's pinned to match the chart card beside it.
function SquareStat({ icon, label, value, caption }) {
  return (
    <div title={caption} className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-pink-50 px-2 py-4 text-center dark:bg-emerald-500/10 lg:gap-1 lg:py-0">
      <div className="flex items-center gap-1.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-pink-600 dark:text-emerald-400 [&_svg]:h-4 [&_svg]:w-4 lg:h-4 lg:w-4 lg:[&_svg]:h-3.5 lg:[&_svg]:w-3.5">
          {icon}
        </span>
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 lg:text-xs">{label}</span>
      </div>
      <div className="text-2xl font-extrabold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  )
}

// flex-1 only bites on lg (see SquareStat) -- on mobile this is a normal
// block with its own comfortable padding.
function RectStat({ icon, label, value, caption }) {
  return (
    <div title={caption} className="flex flex-col justify-center rounded-xl bg-pink-50 px-3.5 py-3 dark:bg-emerald-500/10 lg:flex-1 lg:py-0">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-pink-600 dark:text-emerald-400 [&_svg]:h-3.5 [&_svg]:w-3.5">
          {icon}
        </span>
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{label}</span>
      </div>
      <div className="pl-7 text-base font-bold leading-snug break-words text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  )
}

export default function ResaleLogisticsCard({ logistics }) {
  const { avgProfitPerItem, avgSalePrice, roiPercent, totalItemsSold, highestProfitItem, topTeam } = logistics

  return (
    <Card title="Stats" className="flex flex-col lg:h-full">
      <div className="flex flex-col gap-4 lg:flex-1 lg:gap-3">
        <div className="grid grid-cols-2 gap-3 lg:flex-1 lg:auto-rows-fr lg:gap-2">
          <SquareStat
            icon={ICONS.box}
            label="Items sold"
            value={totalItemsSold}
            caption="Total items marked as sold"
          />
          <SquareStat
            icon={ICONS.profit}
            label="Avg profit"
            value={avgProfitPerItem != null ? formatGBP(avgProfitPerItem, { pence: true, showSign: true }) : '—'}
            caption="Avg. profit per item -- profit ÷ items sold"
          />
          <SquareStat
            icon={ICONS.roi}
            label="ROI"
            value={roiPercent != null ? `${roiPercent}%` : '—'}
            caption="Profit ÷ cost of sold stock"
          />
          <SquareStat
            icon={ICONS.price}
            label="Avg sale price"
            value={avgSalePrice != null ? formatGBP(avgSalePrice, { pence: true }) : '—'}
            caption="Average sold price"
          />
        </div>

        <div className="flex flex-col gap-3 lg:flex-1 lg:gap-2">
          <RectStat
            icon={ICONS.star}
            label="Highest profit item"
            value={highestProfitItem ? `${highestProfitItem.name} · ${formatGBP(highestProfitItem.profit, { pence: true, showSign: true })}` : '—'}
            caption={highestProfitItem ? `${highestProfitItem.name} — best single sale by profit` : 'Best single sale by profit'}
          />
          <RectStat
            icon={ICONS.shirt}
            label="Most sold team"
            value={topTeam ? `${topTeam.original} · ${topTeam.count} sold` : '—'}
            caption={topTeam ? `"${topTeam.original}" appears in ${topTeam.count} sold item names` : 'Team name repeated most often across sold item names'}
          />
        </div>
      </div>
    </Card>
  )
}
