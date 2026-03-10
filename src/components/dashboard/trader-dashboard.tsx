'use client'

import { useMemo } from 'react'
import { StatCard } from '@/components/ui/stat-card'
import { DataTable } from '@/components/ui/data-table'
import { useAuthStore } from '@/lib/store'
import { usePositions, useAllocations, useTransfers } from '@/lib/hooks/use-data'
import { useTraderPnL } from '@/lib/hooks/use-trader-pnl'
import { sumAmounts, formatUSD } from '@/lib/calculations'
import type { Position } from '@/types/database'

export function TraderDashboard() {
  const trader = useAuthStore((s) => s.trader)
  const { data: positions = [], isLoading } = usePositions(trader?.id, 'active')
  const { data: allocations = [] } = useAllocations(trader?.id)
  const { data: transfers = [] } = useTransfers(trader?.id)
  const { traderPnLMap } = useTraderPnL()

  // 자금 흐름 기반 펀드 계산
  const fundStats = useMemo(() => {
    const active = allocations.filter((a) => a.status === 'active')
    let totalIn = 0
    let totalOut = 0

    for (const alloc of active) {
      const meta = alloc.metadata as Record<string, string> | undefined
      const flow = meta?.flow_type ?? ''
      const amount = parseFloat(alloc.amount_usd)

      if (flow === 'head_to_trader' || flow === 'exchange_to_trader' || !flow) {
        totalIn += amount
      }
      if (flow === 'trader_to_exchange' || flow === 'trader_to_head') {
        totalOut += amount
      }
    }

    return { totalIn, totalOut, netFund: totalIn - totalOut }
  }, [allocations])

  // 이체 기반 운용중 자금
  const totalTransferred = sumAmounts(
    transfers.filter((t) => t.status === 'completed').map((t) => t.amount_usd)
  )

  // 실현 P&L (히스토리 확정분)
  const myPnL = trader?.id ? traderPnLMap.get(trader.id) : undefined
  const pnlNum = myPnL ? parseFloat(myPnL.pnl) : 0
  const totalPnL = myPnL?.pnl ?? '0'
  const roiPercent = myPnL?.roi ?? '0.00'
  const roiNum = parseFloat(roiPercent)
  const closedCount = myPnL?.closedCount ?? 0
  const adjustedFund = fundStats.netFund + pnlNum

  const columns = [
    { key: 'direction', header: '방향',
      render: (row: Position) => (
        <span className={row.direction === 'long' ? 'pnl-positive' : 'pnl-negative'}>
          {row.direction === 'long' ? 'Long' : 'Short'}
        </span>
      ),
    },
    { key: 'leverage', header: '레버리지' },
    { key: 'deposit_usd', header: '예치금', align: 'right' as const,
      render: (row: Position) => formatUSD(row.deposit_usd),
    },
    { key: 'status', header: '상태',
      render: (row: Position) => {
        const colors: Record<string, string> = {
          pending: 'text-warning',
          active: 'text-accent',
          closed: 'text-muted',
        }
        return <span className={colors[row.status]}>{row.status}</span>
      },
    },
    { key: 'pnl_usd', header: 'P&L', align: 'right' as const,
      render: (row: Position) => {
        if (!row.pnl_usd) return '-'
        const n = parseFloat(row.pnl_usd)
        return (
          <span className={n >= 0 ? 'pnl-positive' : 'pnl-negative'}>
            {formatUSD(row.pnl_usd)}
          </span>
        )
      },
    },
    { key: 'roi_percent', header: 'ROI', align: 'right' as const,
      render: (row: Position) => {
        if (!row.roi_percent) return '-'
        const n = parseFloat(row.roi_percent)
        return <span className={n >= 0 ? 'pnl-positive' : 'pnl-negative'}>{row.roi_percent}%</span>
      },
    },
    { key: 'entry_date', header: '진입일' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">내 대시보드</h2>

      {/* 자금 현황 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="운용 펀드 (P&L 반영)" value={formatUSD(String(adjustedFund.toFixed(1)))} />
        <StatCard label="운용 중 (이체)" value={formatUSD(totalTransferred)} />
        <StatCard
          label="실현 P&L"
          value={`${pnlNum >= 0 ? '+' : ''}${formatUSD(totalPnL)}`}
          trend={pnlNum > 0 ? 'up' : pnlNum < 0 ? 'down' : 'neutral'}
        />
        <StatCard
          label="ROI"
          value={`${roiNum >= 0 ? '+' : ''}${roiPercent}%`}
          trend={roiNum > 0 ? 'up' : roiNum < 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* 펀드 흐름 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-muted mb-1">할당 원금</p>
          <p className="text-lg font-bold text-foreground">{formatUSD(String(fundStats.netFund.toFixed(1)))}</p>
          <div className="flex gap-3 mt-1">
            <span className="text-xs text-emerald-400">In {formatUSD(String(fundStats.totalIn.toFixed(1)))}</span>
            <span className="text-xs text-red-400">Out {formatUSD(String(fundStats.totalOut.toFixed(1)))}</span>
          </div>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted mb-1">실현 수익/손실</p>
          <p className={`text-lg font-bold ${pnlNum >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {pnlNum >= 0 ? '+' : ''}{formatUSD(totalPnL)}
          </p>
          <p className="text-xs text-muted mt-1">종료 {closedCount}건 확정</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted mb-1">진행 포지션</p>
              <p className="text-lg font-bold text-foreground">{positions.length}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted mb-1">완료</p>
              <p className="text-lg font-bold text-muted">{closedCount}건</p>
            </div>
          </div>
        </div>
      </div>

      {/* 내 포지션 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">내 포지션</h3>
        <DataTable
          columns={columns}
          data={positions}
          isLoading={isLoading}
          emptyMessage="등록된 포지션이 없습니다."
        />
      </div>
    </div>
  )
}
