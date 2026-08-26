import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import ResaleCard, { ResaleCardVisual } from './ResaleCard'
import ResaleDetailModal from './ResaleDetailModal'
import { tapScale } from './motion'
import { itemAllInCost } from '../data/deriveResale'
import { formatGBP } from '../utils/format'

const COLUMNS = [
  { status: 'purchased', label: 'Purchased', dot: 'bg-zinc-400' },
  { status: 'arrived', label: 'Arrived', dot: 'bg-sky-500' },
  { status: 'listed', label: 'Listed', dot: 'bg-amber-500' },
  { status: 'sold', label: 'Sold', dot: 'bg-emerald-500' },
  { status: 'completed', label: 'Completed', dot: 'bg-violet-500' },
]

const SHIPPING_COMPANIES = ['Evri', 'InPost', 'Royal Mail']

// "Completed" isn't a real status in the database -- it's sold items that
// are also paid and shipped, i.e. nothing left to do. Splitting it out as
// its own column (rather than a faded row inside Sold) makes "fully done"
// visually obvious.
function itemColumn(item) {
  if (item.status === 'sold' && item.payment_status === 'paid' && item.shipping_status === 'shipped') return 'completed'
  return item.status
}

// Newest first within a column, by whichever date is relevant to that
// column -- purchase date while stock is still moving through the shop
// floor, sale date once it's sold (both Sold and Completed use it, so a
// completed sale doesn't jump to the top just because it was marked
// paid+shipped moments ago).
function sortForColumn(items, column) {
  const dateField = column === 'sold' || column === 'completed' ? 'sold_date' : 'purchased_date'
  return [...items].sort((a, b) => (b[dateField] ?? '').localeCompare(a[dateField] ?? ''))
}

function fireConfetti() {
  confetti({
    particleCount: 70,
    spread: 65,
    startVelocity: 35,
    origin: { y: 0.7 },
    colors: ['#db2777', '#34d399', '#fbbf24', '#f472b6'],
  })
}

function Column({ status, label, dot, items, onOpen, itemCount }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-2xl border p-3 transition-colors duration-150 sm:w-auto sm:flex-1 ${
        isOver ? 'border-pink-400 bg-pink-50 dark:border-emerald-400/50 dark:bg-emerald-500/10' : 'border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/[0.03]'
      }`}
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
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

function SoldCaptureModal({ item, onCancel, onConfirm }) {
  const [soldPrice, setSoldPrice] = useState(item.target_price ?? item.cost_price ?? '')
  const [soldDate, setSoldDate] = useState(new Date().toISOString().slice(0, 10))
  const [shippingOut, setShippingOut] = useState('')

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 dark:bg-[var(--surface-dark)] sm:rounded-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Sold it! 🎉</h3>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{item.name} — how much for?</p>
        <div className="mb-3 flex h-11 items-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3">
          <span className="text-zinc-500 dark:text-zinc-400">£</span>
          <input
            type="number"
            min="0"
            step="0.01"
            autoFocus
            value={soldPrice}
            onChange={(e) => setSoldPrice(e.target.value)}
            className="w-full bg-transparent px-1 text-sm text-zinc-900 dark:text-zinc-100 outline-none"
          />
        </div>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Sold date</span>
          <input
            type="date"
            value={soldDate}
            onChange={(e) => setSoldDate(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none"
          />
        </label>
        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Shipping out (optional)</span>
          <select
            value={shippingOut}
            onChange={(e) => setShippingOut(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none"
          >
            <option value="">—</option>
            {SHIPPING_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <motion.button
            {...tapScale}
            type="button"
            onClick={() => onConfirm(Number(soldPrice) || 0, soldDate, shippingOut)}
            className="min-h-11 flex-1 cursor-pointer rounded-lg bg-pink-600 dark:bg-emerald-400 text-sm font-medium text-white dark:text-zinc-950"
          >
            Confirm sale
          </motion.button>
          <motion.button {...tapScale} type="button" onClick={onCancel} className="min-h-11 cursor-pointer px-3 text-sm text-zinc-500 dark:text-zinc-400">
            Cancel
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ResaleBoard({ items, onUpdate, onDelete, onMarkSold, onMarkPaid, onMarkShipped }) {
  const [openItem, setOpenItem] = useState(null)
  const [pendingSale, setPendingSale] = useState(null)
  const [activeItem, setActiveItem] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  )

  const handleDragStart = (event) => {
    setActiveItem(items.find((i) => i.id === event.active.id) ?? null)
  }

  // Every move is allowed in either direction -- forward marks progress,
  // backward undoes a mistake and clears whatever no longer applies (an
  // item dragged from Sold back to Listed shouldn't keep a stale sold price).
  const handleDragEnd = (event) => {
    setActiveItem(null)
    const { active, over } = event
    if (!over) return
    const item = items.find((i) => i.id === active.id)
    if (!item) return
    const fromColumn = itemColumn(item)
    const toColumn = over.id
    if (fromColumn === toColumn) return

    if (toColumn === 'sold') {
      if (fromColumn === 'completed') {
        onUpdate(item.id, { payment_status: 'awaiting_payment', shipping_status: 'not_shipped' })
      } else {
        setPendingSale(item) // need a price before it can count as sold
      }
      return
    }

    if (toColumn === 'completed') {
      if (fromColumn !== 'sold') {
        setPendingSale(item) // not sold yet -- capture the sale first
        return
      }
      onUpdate(item.id, { payment_status: 'paid', shipping_status: 'shipped' })
      fireConfetti()
      return
    }

    // purchased / arrived / listed -- both directions go through here
    onUpdate(item.id, {
      status: toColumn,
      sold_price: null,
      sold_date: null,
      payment_status: null,
      shipping_status: null,
      shipping_out: null,
    })
  }

  const confirmSale = async (price, date, shippingOut) => {
    await onMarkSold(pendingSale.id, price, date, shippingOut)
    setPendingSale(null)
    fireConfetti()
  }

  const totalValue = items.reduce((t, i) => t + itemAllInCost(i), 0)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between px-1 text-sm text-zinc-500 dark:text-zinc-400">
        <span>Drag a card either way to move it through the pipeline</span>
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{items.length} items · {formatGBP(totalValue, { pence: true })} tied up</span>
      </div>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2 sm:overflow-visible">
          {COLUMNS.map((col) => {
            const colItems = sortForColumn(items.filter((i) => itemColumn(i) === col.status), col.status)
            return (
              <Column
                key={col.status}
                status={col.status}
                label={col.label}
                dot={col.dot}
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
        />
      )}

      {pendingSale && (
        <SoldCaptureModal item={pendingSale} onCancel={() => setPendingSale(null)} onConfirm={confirmSale} />
      )}
    </div>
  )
}
