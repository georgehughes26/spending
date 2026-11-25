import * as XLSX from 'xlsx'
import { formatDDMMYYYY as ddmmyyyy } from './format'

// Three sheets: stock items (one row per item, bought/sold dates and prices,
// blank where an item hasn't sold yet), direct costs and overheads
// (neither tied to a specific item) -- matches how the reselling page
// itself is split.
function costRowsFor(costs) {
  return costs.map((cost) => ({
    Cost: cost.label,
    From: cost.bought_from ?? '',
    Date: ddmmyyyy(cost.cost_date),
    Amount: Number(cost.amount) || 0,
  }))
}

export function exportResaleToExcel(items, generalCosts, generalExpenses) {
  const itemRows = items.map((item) => ({
    Item: item.name,
    'Bought date': ddmmyyyy(item.purchased_date),
    'Bought price': Number(item.cost_price) || 0,
    'Sold date': ddmmyyyy(item.sold_date),
    'Sold price': item.sold_price != null ? Number(item.sold_price) : '',
  }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(itemRows), 'Items')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(costRowsFor(generalCosts)), 'Direct Costs')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(costRowsFor(generalExpenses)), 'Overheads')

  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `george-reselling-${today}.xlsx`)
}
