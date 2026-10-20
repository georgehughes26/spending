import * as XLSX from 'xlsx'

function ddmmyyyy(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date)
}

// Two sheets: stock items (one row per item, bought/sold dates and prices,
// blank where an item hasn't sold yet) and general costs (not tied to a
// specific item) -- matches how the reselling page itself is split.
export function exportResaleToExcel(items, generalCosts) {
  const itemRows = items.map((item) => ({
    Item: item.name,
    'Bought date': ddmmyyyy(item.purchased_date),
    'Bought price': Number(item.cost_price) || 0,
    'Sold date': ddmmyyyy(item.sold_date),
    'Sold price': item.sold_price != null ? Number(item.sold_price) : '',
  }))

  const costRows = generalCosts.map((cost) => ({
    Cost: cost.label,
    From: cost.bought_from ?? '',
    Date: ddmmyyyy(cost.cost_date),
    Amount: Number(cost.amount) || 0,
  }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(itemRows), 'Items')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(costRows), 'General Costs')

  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `layla-reselling-${today}.xlsx`)
}
