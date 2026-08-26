import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { itemAllInCost, itemProfit, itemPotentialProfit } from '../data/deriveResale'
import { formatDDMM, formatGBP } from '../utils/format'

const COURIER_INITIAL = { Evri: 'E', InPost: 'I', 'Royal Mail': 'R' }

// Pure presentation, no drag hooks -- shared by the draggable card in the
// column and the DragOverlay clone that follows the cursor while dragging.
export function ResaleCardVisual({ item, dragging = false }) {
  const profit = itemProfit(item)
  const potentialProfit = itemPotentialProfit(item)
  const allInCost = itemAllInCost(item)
  const completed = item.status === 'sold' && item.payment_status === 'paid'
  const dateLabel = { purchased: item.purchased_date, listed: item.listed_date, sold: item.sold_date }[item.status]

  return (
    <div
      className={`group rounded-xl border p-3 text-left shadow-sm transition-shadow duration-150 ${
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
        {item.status !== 'sold' && item.target_price != null && ` · target ${formatGBP(item.target_price, { pence: true })}`}
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

      {item.status === 'sold' && (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            title={item.payment_status === 'paid' ? 'Paid' : 'Awaiting payment'}
            className={`h-1.5 w-1.5 rounded-full ${item.payment_status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}
          />
          <span
            title={item.shipping_status === 'shipped' ? 'Shipped' : 'Not shipped'}
            className={`h-1.5 w-1.5 rounded-full ${item.shipping_status === 'shipped' ? 'bg-sky-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
          />
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
