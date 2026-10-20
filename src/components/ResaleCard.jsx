import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { itemAllInCost, itemProfit, itemPotentialProfit } from '../data/deriveResale'
import { formatDDMM, formatGBP } from '../utils/format'

const COURIER_INITIAL = { Evri: 'E', InPost: 'I', 'Royal Mail': 'R' }

// One colour-coded stage per item. "Completed" is a real board column now,
// not derived -- "shipped" is still a lighter sub-badge shown on a Sold
// item that's part-way there (paid/shipped tracked independently via
// payment_status/shipping_status, "Mark paid"/"Mark shipped").
export const STAGE_META = {
  purchased: { label: 'Purchased', box: 'bg-zinc-300 dark:bg-zinc-600', border: 'border-l-zinc-300 dark:border-l-zinc-600' },
  listed: { label: 'Listed', box: 'bg-amber-400 dark:bg-amber-500', border: 'border-l-amber-400 dark:border-l-amber-500' },
  sold: { label: 'Sold', box: 'bg-emerald-300 dark:bg-emerald-500/60', border: 'border-l-emerald-300 dark:border-l-emerald-500/60' },
  shipped: { label: 'Shipped', box: 'bg-emerald-500 dark:bg-emerald-500', border: 'border-l-emerald-500 dark:border-l-emerald-500' },
  completed: { label: 'Completed', box: 'bg-emerald-800 opacity-50 dark:bg-emerald-700 dark:opacity-60', border: 'border-l-emerald-800/50 dark:border-l-emerald-700/60' },
}

export function cardStage(item) {
  if (item.status !== 'sold') return item.status
  if (item.shipping_status === 'shipped') return 'shipped'
  return 'sold'
}

// Pure presentation, no drag hooks -- shared by the draggable card in the
// column and the DragOverlay clone that follows the cursor while dragging.
export function ResaleCardVisual({ item, dragging = false }) {
  const profit = itemProfit(item)
  const potentialProfit = itemPotentialProfit(item)
  const allInCost = itemAllInCost(item)
  const stage = cardStage(item)
  const completed = stage === 'completed'
  const dateLabel = { purchased: item.purchased_date, listed: item.listed_date, sold: item.sold_date, completed: item.sold_date }[item.status]

  const stageBorder = STAGE_META[stage]?.border ?? STAGE_META.purchased.border

  return (
    <div
      className={`group rounded-xl border border-l-4 p-3 text-left shadow-sm transition-shadow duration-150 ${stageBorder} ${
        dragging ? 'rotate-2 cursor-grabbing shadow-xl' : 'cursor-grab hover:shadow-md active:cursor-grabbing'
      } ${
        completed
          ? 'border-zinc-200 bg-zinc-50 opacity-60 dark:border-white/5 dark:bg-white/[0.02]'
          : 'border-zinc-200 bg-white dark:border-white/10 dark:bg-white/5'
      }`}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-100">{item.name}</span>
        <span className="shrink-0 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">#{item.sku}</span>
      </div>

      <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
        {dateLabel ? formatDDMM(dateLabel) : null}
        {(item.status === 'purchased' || item.status === 'listed') && item.target_price != null && ` · target ${formatGBP(item.target_price, { pence: true })}`}
      </div>

      <div className="flex items-end justify-between">
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {formatGBP(allInCost, { pence: true })}
        </div>
        {profit != null && (
          <span className={`text-sm font-bold ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatGBP(profit, { pence: true, showSign: true })}
          </span>
        )}
        {profit == null && potentialProfit != null && (
          <span className="text-xs font-medium text-pink-600 dark:text-emerald-400">
            est. {formatGBP(potentialProfit, { pence: true, showSign: true })}
          </span>
        )}
      </div>

      {(item.status === 'sold' || item.shipping_out) && (
        <div className="mt-2 flex items-center gap-1.5">
          {item.status === 'sold' && (
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{STAGE_META[stage]?.label}</span>
          )}
          {item.shipping_out && (
            <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-zinc-100 text-[9px] font-bold text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
              {COURIER_INITIAL[item.shipping_out] ?? '?'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function ResaleCard({ item, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { status: item.status },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={() => onOpen(item)} className="touch-none">
      <ResaleCardVisual item={item} />
    </div>
  )
}
