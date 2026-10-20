import confetti from 'canvas-confetti'

export const COLUMNS = [
  { status: 'purchased', label: 'Purchased' },
  { status: 'listed', label: 'Listed' },
  { status: 'sold', label: 'Sold' },
]

// The board only has these three columns -- whether a sold item is also
// paid/shipped is still tracked (payment_status/shipping_status, "Mark
// paid"/"Mark shipped") and shown per-card (see cardStage in ResaleCard.jsx),
// it just no longer splits Sold into separate board columns.
export function itemColumn(item) {
  return item.status
}

// Newest first within a column, by whichever date is relevant to that
// column -- purchase date while stock is still moving through the shop
// floor, sale date once it's sold.
export function sortForColumn(items, column) {
  const dateField = column === 'sold' ? 'sold_date' : 'purchased_date'
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
    return { type: 'needs-sale' } // need a price (and sold-on/date) before it can count as sold
  }

  // purchased / listed -- both directions go through here. listed_date is
  // stamped the moment a card lands in Listed and cleared if it moves back
  // out, since that's the only place it's set -- it's what "average days to
  // sell" is measured from. Moving a sold item backward also clears its
  // sale-only fields and any paid/shipped progress, since those no longer
  // apply once it's not marked sold.
  return {
    type: 'update',
    fields: {
      status: toColumn,
      listed_date: toColumn === 'listed' ? new Date().toISOString().slice(0, 10) : null,
      sold_price: null,
      sold_date: null,
      sold_on: null,
      payment_status: null,
      shipping_status: null,
      shipping_out: null,
    },
  }
}
