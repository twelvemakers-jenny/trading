import * as XLSX from 'xlsx'

interface ExportColumn {
  header: string
  key: string
}

export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
) {
  const rows = data.map((row) =>
    columns.reduce<Record<string, unknown>>((acc, col) => {
      acc[col.header] = row[col.key] ?? ''
      return acc
    }, {})
  )

  const ws = XLSX.utils.json_to_sheet(rows)

  // 열 너비 자동 조정
  const colWidths = columns.map((col) => {
    const maxLen = Math.max(
      col.header.length,
      ...rows.map((r) => String(r[col.header] ?? '').length)
    )
    return { wch: Math.min(maxLen + 2, 40) }
  })
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${filename}_${today}.xlsx`)
}
