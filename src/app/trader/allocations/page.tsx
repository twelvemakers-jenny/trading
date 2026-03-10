'use client'

import { useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { FlowBadge } from '@/components/ui/flow-badge'
import { useAuthStore } from '@/lib/store'
import { useAllocations } from '@/lib/hooks/use-data'
import { formatUSD } from '@/lib/calculations'
import type { Allocation } from '@/types/database'

export default function TraderAllocationsPage() {
  const trader = useAuthStore((s) => s.trader)
  const { data: allocations = [], isLoading } = useAllocations(trader?.id)

  // 트레이더 전용: 본인에게 할당된 자금 요약
  const summary = useMemo(() => {
    const active = allocations.filter((a) => a.status === 'active')
    let totalIn = 0
    let totalOut = 0

    for (const alloc of active) {
      const meta = alloc.metadata as Record<string, string> | undefined
      const flow = meta?.flow_type ?? ''
      const amount = parseFloat(alloc.amount_usd)

      // 트레이더에게 들어오는 자금
      if (flow === 'head_to_trader' || flow === 'exchange_to_trader') {
        totalIn += amount
      }
      // 트레이더에서 나가는 자금
      if (flow === 'trader_to_exchange' || flow === 'trader_to_head') {
        totalOut += amount
      }
      // flow_type 미설정 (기존 데이터 호환)
      if (!flow) {
        totalIn += amount
      }
    }

    return {
      totalIn,
      totalOut,
      netFund: totalIn - totalOut,
      count: active.length,
    }
  }, [allocations])

  const columns = [
    { key: 'flow_type', header: '자금 흐름',
      render: (row: Allocation) => {
        const meta = row.metadata as Record<string, string> | undefined
        return meta?.flow_type
          ? <FlowBadge flow={meta.flow_type} />
          : <span className="text-xs text-muted">-</span>
      },
    },
    { key: 'amount_usd', header: '금액', align: 'right' as const,
      render: (row: Allocation) => formatUSD(row.amount_usd),
    },
    { key: 'status', header: '상태',
      render: (row: Allocation) => {
        const colors: Record<string, string> = {
          active: 'text-accent',
          adjusted: 'text-warning',
          closed: 'text-muted',
        }
        return <span className={`text-xs font-medium ${colors[row.status] ?? 'text-muted'}`}>{row.status}</span>
      },
    },
    { key: 'memo', header: '메모',
      render: (row: Allocation) => row.memo || '-',
    },
    { key: 'created_at', header: '할당일',
      render: (row: Allocation) => new Date(row.created_at).toLocaleDateString('ko-KR'),
    },
  ]

  return (
    <DashboardLayout>
      <PageHeader title="내 펀드" description="할당된 자금 현황" />

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-5">
          <p className="text-xs text-muted mb-1">보유 펀드</p>
          <p className="text-2xl font-bold text-foreground">
            {formatUSD(String(summary.netFund.toFixed(1)))}
          </p>
          <p className="text-xs text-muted mt-2">{summary.count}건 할당</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-muted mb-1">받은 자금 (In)</p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatUSD(String(summary.totalIn.toFixed(1)))}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-muted mb-1">이체/반납 (Out)</p>
          <p className="text-2xl font-bold text-red-400">
            {formatUSD(String(summary.totalOut.toFixed(1)))}
          </p>
        </div>
      </div>

      {/* 할당 내역 */}
      <DataTable columns={columns} data={allocations} isLoading={isLoading} />
    </DashboardLayout>
  )
}
