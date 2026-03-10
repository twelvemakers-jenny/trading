// 핵심 지표 카드 — 글래스모피즘 디자인
interface StatCardProps {
  label: string
  value: string
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function StatCard({ label, value, subValue, trend }: StatCardProps) {
  const trendColor =
    trend === 'up'
      ? 'text-success'
      : trend === 'down'
        ? 'text-danger'
        : 'text-muted'

  return (
    <div className="glass-card p-5">
      <p className="text-xs text-muted uppercase tracking-wider mb-2">
        {label}
      </p>
      <p className={`text-2xl font-bold font-mono ${trendColor}`}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-muted mt-1">{subValue}</p>
      )}
    </div>
  )
}
