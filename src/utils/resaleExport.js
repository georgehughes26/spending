import * as XLSX from 'xlsx'
import { formatDDMMYYYY as ddmmyyyy } from './format'
import { sheetFromRows } from './sheet'
import { COLUMNS } from './resaleStages'
import {
  MILEAGE_RATE,
  deriveResaleLogistics,
  deriveResaleSummary,
  isRealizedSale,
  itemProfit,
  mileageCost,
  taxPotAmount,
} from '../data/deriveResale'

const STATUS_LABELS = Object.fromEntries(COLUMNS.map((c) => [c.status, c.label]))
const ITEM_HEADERS = [
  '#', 'Item', 'Status', 'Bought from', 'Bought date', 'Bought price',
  'Sold on', 'Sold price', 'Completed date', 'Profit', 'Tax pot (20%)',
]
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const numberOrBlank = (value) => (value === undefined || value === null ? '' : Number(value) || 0)

function costRowsFor(costs) {
  return costs.map((cost) => ({
    Cost: cost.label,
    From: cost.bought_from ?? '',
    Date: ddmmyyyy(cost.cost_date),
    Amount: Number(cost.amount) || 0,
  }))
}

// Everything on the reselling page, one sheet each: a Summary of the
// headline figures (same maths as the top of the page), every stock item,
// Direct Costs, Overheads, Mileage (with its 55p-a-mile value) and Hours.
export function exportResaleToExcel({ items, directCosts, overheads, mileage, hours }) {
  const summary = deriveResaleSummary(items, directCosts, overheads, mileage)
  const { avgProfitPerItem, totalItemsSold } = deriveResaleLogistics(items, directCosts)
  const totalHours = hours.reduce((t, h) => t + (Number(h.hours) || 0), 0)
  const completedTaxPot = round2(
    items.filter((i) => isRealizedSale(i.status)).reduce((t, i) => t + taxPotAmount(i.sold_price), 0),
  )
  const ratePence = Math.round(MILEAGE_RATE * 100)

  const summaryRows = [
    { Figure: 'Sales', Value: summary.totalSales, Notes: 'Completed sales only' },
    { Figure: 'Stock cost', Value: summary.soldCost, Notes: 'Cost price of the items sold' },
    { Figure: 'Direct costs', Value: summary.generalCostsTotal, Notes: '' },
    { Figure: 'Total costs', Value: summary.totalCost, Notes: 'Stock cost + direct costs' },
    { Figure: 'Gross profit', Value: summary.grossProfit, Notes: 'Sales - total costs' },
    { Figure: 'Overheads', Value: summary.overheadsTotal, Notes: '' },
    { Figure: 'Mileage', Value: summary.mileageTotal, Notes: `${round2(summary.totalMiles)} miles at ${ratePence}p a mile` },
    { Figure: 'Total overheads', Value: summary.totalExpenses, Notes: 'Overheads + mileage' },
    { Figure: 'Net profit', Value: summary.netProfit, Notes: 'Gross profit - total overheads' },
    { Figure: 'Pending profit', Value: summary.pendingProfit, Notes: 'Marked Sold, not yet Completed' },
    { Figure: 'Items sold', Value: totalItemsSold, Notes: 'Completed' },
    { Figure: 'Avg profit per item', Value: avgProfitPerItem ?? '', Notes: 'Gross profit / items sold' },
    { Figure: 'Tax pot', Value: completedTaxPot, Notes: '20% of completed sales' },
    { Figure: 'Hours worked', Value: round2(totalHours), Notes: 'Hours, not £' },
  ].map((row) => ({ ...row, Value: row.Value === '' ? '' : round2(row.Value) }))

  // Oldest parcel number first, so the sheet reads in the order stock came in.
  const sortedItems = [...items].sort((a, b) => (Number(a.sku) || 0) - (Number(b.sku) || 0))
  const itemRows = sortedItems.map((item) => {
    const hasSale = (item.status === 'sold' || item.status === 'completed') && item.sold_price != null
    return {
      '#': item.sku ?? '',
      Item: item.name,
      Status: STATUS_LABELS[item.status] ?? item.status,
      'Bought from': item.bought_from ?? '',
      'Bought date': ddmmyyyy(item.purchased_date),
      'Bought price': Number(item.cost_price) || 0,
      'Sold on': item.sold_on ?? '',
      'Sold price': numberOrBlank(item.sold_price),
      'Completed date': ddmmyyyy(item.sold_date),
      Profit: itemProfit(item) ?? '',
      'Tax pot (20%)': hasSale ? taxPotAmount(item.sold_price) : '',
    }
  })

  const mileageRows = mileage.map((trip) => ({
    Date: ddmmyyyy(trip.trip_date),
    Reason: trip.reason,
    Miles: Number(trip.miles) || 0,
    [`Amount (${ratePence}p/mile)`]: mileageCost(trip.miles),
  }))

  const hoursRows = hours.map((entry) => ({
    Date: ddmmyyyy(entry.work_date),
    Activity: entry.activity,
    Hours: Number(entry.hours) || 0,
  }))

  const costHeaders = ['Cost', 'From', 'Date', 'Amount']
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(summaryRows, ['Figure', 'Value', 'Notes']), 'Summary')
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(itemRows, ITEM_HEADERS), 'Items')
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(costRowsFor(directCosts), costHeaders), 'Direct Costs')
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(costRowsFor(overheads), costHeaders), 'Overheads')
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(mileageRows, ['Date', 'Reason', 'Miles', `Amount (${ratePence}p/mile)`]), 'Mileage')
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(hoursRows, ['Date', 'Activity', 'Hours']), 'Hours')

  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `george-reselling-${today}.xlsx`)
}
