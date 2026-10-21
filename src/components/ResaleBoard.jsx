import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import ResaleCard, { ResaleCardVisual, STAGE_META } from './ResaleCard'
import ResaleDetailModal from './ResaleDetailModal'
import SoldCaptureModal from './SoldCaptureModal'
import CompleteCaptureModal from './CompleteCaptureModal'
import { tapScale } from './motion'
import { itemAllInCost } from '../data/deriveResale'
import { COLUMNS, fireConfetti, itemColumn, resolveMove, sortForColumn } from '../utils/resaleStages'
import { formatGBP } from '../utils/format'

function Column({ status, label, items, onOpen, itemCount }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const box = STAGE_META[status]?.box ?? STAGE_META.purchased.box
  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-2xl border p-3 transition-colors duration-150 sm:w-auto sm:flex-1 ${
        isOver ? 'border-pink-400 bg-pink-50 dark:border-emerald-400/50 dark:bg-emerald-500/10' : 'border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/[0.03]'
      }`}
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={`h-3 w-3 rounded-[3px] ${box}`} />
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className="ml-auto rounded-full bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
          {itemCount}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <ResaleCard key={item.id} item={item} onOpen={onOpen} />
        ))}
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-400 dark:border-white/10 dark:text-zinc-600">
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResaleBoard({ items, onUpdate, onDelete, onMarkSold, onMarkPaid, onMarkShipped, hideCompleted, onToggleHideCompleted }) {
  const [openItem, setOpenItem] = useState(null)
  const [pendingSale, setPendingSale] = useState(null)
  const [pendingComplete, setPendingComplete] = useState(null)
  const [activeItem, setActiveItem] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  )

  const handleDragStart = (event) => {
    setActiveItem(items.find((i) => i.id === event.active.id) ?? null)
  }

  const applyMove = (item, toColumn) => {
    const move = resolveMove(item, toColumn)
    if (!move) return
    if (move.type === 'needs-sale') {
      setPendingSale(item) // need a price before it can count as sold
      return
    }
    if (move.type === 'needs-completion') {
      setPendingComplete(item) // need the completed date before it can count as done
      return
    }
    onUpdate(item.id, move.fields)
    if (move.celebrate) fireConfetti()
  }

  const handleDragEnd = (event) => {
    setActiveItem(null)
    const { active, over } = event
    if (!over) return
    const item = items.find((i) => i.id === active.id)
    if (!item) return
    applyMove(item, over.id)
  }

  // Also used by the "Move to" buttons inside the detail modal, for anyone
  // who taps a card rather than dragging it.
  const handleMoveToStage = (item, toColumn) => {
    applyMove(item, toColumn)
    setOpenItem(null)
  }

  const confirmSale = async (price, shippingOut, soldOn) => {
    await onMarkSold(pendingSale.id, price, shippingOut, soldOn)
    setPendingSale(null)
    fireConfetti()
  }

  const confirmComplete = async (date) => {
    await onUpdate(pendingComplete.id, { status: 'completed', sold_date: date })
    setPendingComplete(null)
    fireConfetti()
  }

  // "Tied up" is money spent on stock that hasn't come back out as a
  // completed sale yet -- Completed items are a done deal, their cost has
  // already been recovered, so they don't belong in this figure.
  const activeItems = items.filter((i) => i.status !== 'completed')
  const totalValue = activeItems.reduce((t, i) => t + itemAllInCost(i), 0)
  const visibleColumns = hideCompleted ? COLUMNS.filter((c) => c.status !== 'completed') : COLUMNS

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-zinc-500 dark:text-zinc-400">
        <span>Drag a card either way to move it through the pipeline</span>
        <div className="flex items-center gap-3">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {activeItems.length} in progress · {formatGBP(totalValue, { pence: true })} tied up
          </span>
          <motion.button
            {...tapScale}
            type="button"
            onClick={onToggleHideCompleted}
            className="min-h-9 cursor-pointer rounded-lg border border-zinc-300 dark:border-white/15 px-3 text-xs font-medium text-zinc-600 dark:text-zinc-300"
          >
            {hideCompleted ? 'Show completed' : 'Hide completed'}
          </motion.button>
        </div>
      </div>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2 sm:overflow-visible">
          {visibleColumns.map((col) => {
            const colItems = sortForColumn(items.filter((i) => itemColumn(i) === col.status), col.status)
            return (
              <Column
                key={col.status}
                status={col.status}
                label={col.label}
                itemCount={colItems.length}
                items={colItems}
                onOpen={setOpenItem}
              />
            )
          })}
        </div>
        <DragOverlay>
          {activeItem ? <div className="w-72 sm:w-auto"><ResaleCardVisual item={activeItem} dragging /></div> : null}
        </DragOverlay>
      </DndContext>

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

      {pendingComplete && (
        <CompleteCaptureModal item={pendingComplete} onCancel={() => setPendingComplete(null)} onConfirm={confirmComplete} />
      )}
    </div>
  )
}
