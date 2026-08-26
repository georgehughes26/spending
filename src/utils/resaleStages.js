import confetti from 'canvas-confetti'

export const COLUMNS = [
  { status: 'purchased', label: 'Purchased' },
  { status: 'arrived', label: 'Arrived' },
  { status: 'listed', label: 'Listed' },
  { status: 'sold', label: 'Sold' },
  { status: 'completed', label: 'Completed' },
]

// "Completed" isn't a real status in the database -- it's sold items that
// are also paid and shipped, i.e. nothing left to do. Splitting it out as
// its own column (rather than a faded row inside Sold) makes "fully done"
// visually obvious.
export function itemColumn(item) {
  if (item.status === 'sold' && item.payment_status === 'paid' && item.shipping_status === 'shipped') return 'completed'
  return item.status
}

// Newest first within a column, by whichever date is relevant to that
// column -- purchase date while stock is still moving through the shop
// floor, sale date once it's sold (both Sold and Completed use it, so a
// completed sale doesn't jump to the top just because it was marked
// paid+shipped moments ago).
export function sortForColumn(items, column) {
  const dateField = column === 'sold' || column === 'completed' ? 'sold_date' : 'purchased_date'
  return [...items].sort((a, b) => (b[dateField] ?? '').localeCompare(a[dateField] ?? ''))
}

export function fireConfetti() {
  confetti({
    particleCount: 70,
    spread: 65,
    startVelocity: 35,
    origin: { y: 0.7 },
    colors: ['#db2777', '#34d399', '#fbbf24', '#f472b6'],
  })
}

// The move rules shared by drag-and-drop (desktop) and tap-to-move
// (mobile) -- every move is allowed in either direction, forward marks
// progress, backward undoes a mistake and clears whatever no longer
// applies. Returns null for a no-op move, { type: 'needs-sale' } when a
// sale price has to be captured first, or { type: 'update', fields,
// celebrate? } for a direct field update.
export function resolveMove(item, toColumn) {
  const fromColumn = itemColumn(item)
  if (fromColumn === toColumn) return null

  if (toColumn === 'sold') {
    if (fromColumn === 'completed') {
      return { type: 'update', fields: { payment_status: 'awaiting_payment', shipping_status: 'not_shipped' } }
    }
    return { type: 'needs-sale' } // need a price before it can count as sold
  }

  if (toColumn === 'completed') {
    if (fromColumn !== 'sold') return { type: 'needs-sale' } // not sold yet -- capture the sale first
    return { type: 'update', fields: { payment_status: 'paid', shipping_status: 'shipped' }, celebrate: true }
  }

  // purchased / arrived / listed -- both directions go through here.
  // listed_date is stamped the moment a card lands in Listed and cleared
  // if it moves back out, since that's the only place it's set -- it's
  // what "average days to sell" is measured from.
  return {
    type: 'update',
    fields: {
      status: toColumn,
      listed_date: toColumn === 'listed' ? new Date().toISOString().slice(0, 10) : null,
      sold_price: null,
      sold_date: null,
      payment_status: null,
      shipping_status: null,
      shipping_out: null,
    },
  }
}
