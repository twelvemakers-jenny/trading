'use client'

// 범용 데이터 테이블 — 다크모드 트레이딩 터미널 스타일
interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  align?: 'left' | 'right' | 'center'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading,
  emptyMessage = '데이터가 없습니다.',
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="glass-card p-8 text-center text-muted text-sm">
        데이터 로딩 중...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-muted text-sm">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-card-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider
                    ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={(row.id as string) ?? i}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-card-border/50 transition-colors
                  ${onRowClick ? 'cursor-pointer hover:bg-card-border/20' : ''}
                  ${i % 2 === 0 ? '' : 'bg-card-border/5'}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm
                      ${col.align === 'right' ? 'text-right font-mono' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  >
                    {col.render
                      ? col.render(row)
                      : String(row[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
