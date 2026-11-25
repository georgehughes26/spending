import * as XLSX from 'xlsx'

// A worksheet with columns in `headers` order and plain widths sized to the
// longest value in each column, so the sheet is readable on open without
// dragging every column out by hand. Shared by the spending and reselling
// exports.
export function sheetFromRows(rows, headers) {
  const sheet = XLSX.utils.json_to_sheet(rows, { header: headers })
  sheet['!cols'] = headers.map((h) => ({
    wch: Math.min(40, Math.max(h.length, ...rows.map((r) => String(r[h] ?? '').length)) + 2),
  }))
  return sheet
}
