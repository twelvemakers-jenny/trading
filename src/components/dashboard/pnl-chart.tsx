'use client'

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { calculatePnL } from '@/lib/calculations'
import type { Position } from '@/types/database'

interface PnLChartProps {
  positions: Position[]
}

export function PnLChart({ positions }: PnLChartProps) {
  if (positions.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-muted text-sm">
        차트 데이터가 없습니다.
      </div>
    )
  }

  // 월별 P&L + ROI 집계
  const monthly: Record<string, { pnl: number; deposit: number }> = {}
  for (const p of positions) {
    if (!p.exit_date) continue
    const month = p.exit_date.slice(0, 7)
    const pnl = parseFloat(calculatePnL(p.deposit_usd, p.closing_balance_usd))
    const deposit = parseFloat(p.deposit_usd || '0')
    const prev = monthly[month] ?? { pnl: 0, deposit: 0 }
    monthly[month] = { pnl: prev.pnl + pnl, deposit: prev.deposit + deposit }
  }

  const chartData = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { pnl, deposit }]) => ({
      month,
      pnl: Math.round(pnl * 100) / 100,
      roi: deposit > 0 ? Math.round((pnl / deposit) * 10000) / 100 : 0,
    }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* P&L 바 차트 */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted mb-4">월별 P&L</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #1e293b',
                borderRadius: 8,
                color: '#e2e8f0',
              }}
              formatter={(value) => [`$${Number(value).toLocaleString()}`, 'P&L']}
            />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ROI 라인 차트 */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted mb-4">월별 ROI (%)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #1e293b',
                borderRadius: 8,
                color: '#e2e8f0',
              }}
              formatter={(value) => [`${Number(value).toFixed(1)}%`, 'ROI']}
            />
            <Line
              type="monotone"
              dataKey="roi"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
