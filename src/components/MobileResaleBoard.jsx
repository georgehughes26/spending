import { useState } from 'react'
import { motion } from 'framer-motion'
import { ResaleCardVisual, STAGE_META } from './ResaleCard'
import ResaleDetailModal from './ResaleDetailModal'
import SoldCaptureModal from './SoldCaptureModal'
import { tapScale } from './motion'
import { itemAllInCost } from '../data/deriveResale'
import { COLUMNS, fireConfetti, itemColumn, resolveMove, sortForColumn } from '../utils/resaleStages'
import { formatGBP } from '../utils/format'

function StageTab({ status, label, count, active, onClick }) {
  const box = STAGE_META[status]?.box ?? STAGE_META.purchased.box
  return (
    <motion.button
      {...tapScale}
      type="button"
      onClick={onClick}
      className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors duration-150 ${
        active
          ? 'border-pink-600 bg-pink-600 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-zinc-950'
          : 'border-zinc-300 text-zinc-600 dark:border-white/15 dark:text-zinc-300'
      }`}
    >
      <span className={`h-2 w-2 rounded-[2px] ${active ? 'bg-white dark:bg-zinc-950' : box}`} />
      {label}
      <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/25 dark:bg-zinc-950/20' : 'bg-zinc-200 dark:bg-white/10'}`}>
        {count}
      </span>
    </motion.button>
  )
}

// Drag-and-drop needs precision that's hard to get right with a thumb --
// this is a tap-to-open, button-to-move alternative for mobile: pick a
// stage tab to filter the list, tap a card, then use the "Move to" buttons
// in the detail modal instead of dragging.
export default function MobileResaleBoard({ items, onUpdate, onDelete, onMarkSold, onMarkPaid, onMarkShipped }) {
  const [activeStage, setActiveStage] = useState('purchased')
  const [openItem, setOpenItem] = useState(null)
  const [pendingSale, setPendingSale] = useState(null)

  const applyMove = (item, toColumn) => {
    const move = resolveMove(item, toColumn)
    if (!move) return
    if (move.type === 'needs-sale') {
      setPendingSale(item)
      return
    }
    onUpdate(item.id, move.fields)
    if (move.celebrate) fireConfetti()
  }

  const handleMoveToStage = (item, toColumn) => {
    applyMove(item, toColumn)
    setOpenItem(null)
  }

  const confirmSale = async (price, date, shippingOut) => {
    await onMarkSold(pendingSale.id, price, date, shippingOut)
    setPendingSale(null)
    fireConfetti()
  }

  const totalValue = items.reduce((t, i) => t + itemAllInCost(i), 0)

  const counts = Object.fromEntries(COLUMNS.map((c) => [c.status, 0]))
  for (const item of items) counts[itemColumn(item)] = (counts[itemColumn(item)] ?? 0) + 1

  const visibleItems = sortForColumn(items.filter((i) => itemColumn(i) === activeStage), activeStage)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between px-1 text-sm text-zinc-500 dark:text-zinc-400">
        <span>Tap a card to move it</span>
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{items.length} items · {formatGBP(totalValue, { pence: true })} tied up</span>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {COLUMNS.map((col) => (
          <StageTab
            key={col.status}
            status={col.status}
            label={col.label}
            count={counts[col.status]}
            active={activeStage === col.status}
            onClick={() => setActiveStage(col.status)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {visibleItems.map((item) => (
          <button key={item.id} type="button" onClick={() => setOpenItem(item)} className="cursor-pointer text-left">
            <ResaleCardVisual item={item} />
          </button>
        ))}
        {visibleItems.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400 dark:border-white/10 dark:text-zinc-600">
            Nothing here yet.
          </div>
        )}
      </div>

      {openItem && (
        <ResaleDetailModal
          item={items.find((i) => i.id === openItem.id) ?? openItem}
          onClose={() => setOpenItem(null)}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onMarkPaid={onMarkPaid}
          onMarkShipped={onMarkShipped}
          onMoveToStage={handleMoveToStage}
        />
      )}

      {pendingSale && (
        <SoldCaptureModal item={pendingSale} onCancel={() => setPendingSale(null)} onConfirm={confirmSale} />
      )}
    </div>
  )
}
