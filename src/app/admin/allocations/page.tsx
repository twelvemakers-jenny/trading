'use client'

import { useState, useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { Modal } from '@/components/ui/modal'
import { DynamicForm } from '@/components/forms/dynamic-form'
import { FlowBadge, FlowFilter, getFlowsByRole, getFlowOptions } from '@/components/ui/flow-badge'
import { useAllocations, useTraders, useInsert, useUpdate, useDelete } from '@/lib/hooks/use-data'
import { useTraderPnL } from '@/lib/hooks/use-trader-pnl'
import { useAuthStore } from '@/lib/store'
import { formatUSD } from '@/lib/calculations'
import type { Allocation, Trader, FieldDefinition } from '@/types/database'

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

export default function AllocationsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Allocation | null>(null)
  const [activeFlow, setActiveFlow] = useState<string | null>(null)
  const currentUser = useAuthStore((s) => s.trader)
  const { data: allocations = [], isLoading } = useAllocations()
  const { data: traders = [] } = useTraders()
  const insertAllocation = useInsert<Record<string, unknown>>('allocations', ['allocations'])
  const updateAllocation = useUpdate<Record<string, unknown>>('allocations', ['allocations'])
  const deleteAllocation = useDelete('allocations', ['allocations'])

  const { traderPnLMap, totalPnL: totalRealizedPnL } = useTraderPnL()
  const flows = getFlowsByRole(currentUser?.role)
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'head_trader'

  // 흐름별 합계 계산
  const fundSummary = useMemo(() => {
    const active = allocations.filter((a) => a.status === 'active')

    let totalAUM = 0
    let headFund = 0
    const traderFunds = new Map<string, { name: string; role: string; fund: number }>()

    for (const alloc of active) {
      const meta = alloc.metadata as Record<string, string> | undefined
      const flow = meta?.flow_type ?? ''
      const amount = parseFloat(alloc.amount_usd)
      const trader = traders.find((t) => t.id === alloc.trader_id)

      switch (flow) {
        case 'company_to_head':
          totalAUM += amount
          headFund += amount
          break
        case 'head_to_trader': {
          headFund -= amount
          const existing = traderFunds.get(alloc.trader_id) ?? { name: trader?.name ?? '미지정', role: trader?.role ?? 'trader', fund: 0 }
          existing.fund += amount
          traderFunds.set(alloc.trader_id, existing)
          break
        }
        case 'trader_to_exchange': {
          const ex = traderFunds.get(alloc.trader_id)
          if (ex) ex.fund -= amount
          break
        }
        case 'exchange_to_trader': {
          const ex2 = traderFunds.get(alloc.trader_id) ?? { name: trader?.name ?? '미지정', role: trader?.role ?? 'trader', fund: 0 }
          ex2.fund += amount
          traderFunds.set(alloc.trader_id, ex2)
          break
        }
        case 'trader_to_head': {
          const ex3 = traderFunds.get(alloc.trader_id)
          if (ex3) ex3.fund -= amount
          headFund += amount
          break
        }
        case 'head_to_company':
          headFund -= amount
          totalAUM -= amount
          break
        default:
          totalAUM += amount
          {
            const fallback = traderFunds.get(alloc.trader_id) ?? { name: trader?.name ?? '미지정', role: trader?.role ?? 'trader', fund: 0 }
            fallback.fund += amount
            traderFunds.set(alloc.trader_id, fallback)
          }
          break
      }
    }

    const traderList = Array.from(traderFunds.entries())
      .map(([id, data]) => {
        const pnlData = traderPnLMap.get(id)
        const pnl = pnlData ? parseFloat(pnlData.pnl) : 0
        const roi = pnlData?.roi ?? '0.00'
        return { id, ...data, pnl, roi, adjustedFund: data.fund + pnl }
      })
      .sort((a, b) => b.adjustedFund - a.adjustedFund)

    const totalTraderFunds = traderList.reduce((sum, t) => sum + t.fund, 0)
    const totalAdjusted = traderList.reduce((sum, t) => sum + t.adjustedFund, 0)

    return { totalAUM, headFund, traderList, totalTraderFunds, totalAdjusted }
  }, [allocations, traders, traderPnLMap])

  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // 흐름 필터 + 정렬
  const filteredAllocations = useMemo(() => {
    let result = allocations
    if (activeFlow) {
      result = result.filter((a) => {
        const meta = a.metadata as Record<string, string> | undefined
        return meta?.flow_type === activeFlow
      })
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let valA: string | number = ''
        let valB: string | number = ''
        if (sortKey === 'trader_id') {
          valA = (traders.find((t) => t.id === a.trader_id)?.name ?? '').toLowerCase()
          valB = (traders.find((t) => t.id === b.trader_id)?.name ?? '').toLowerCase()
        } else if (sortKey === 'amount_usd') {
          valA = parseFloat(a.amount_usd)
          valB = parseFloat(b.amount_usd)
        } else if (sortKey === 'created_at') {
          valA = new Date(a.created_at).getTime()
          valB = new Date(b.created_at).getTime()
        } else if (sortKey === 'flow_type') {
          const metaA = a.metadata as Record<string, string> | undefined
          const metaB = b.metadata as Record<string, string> | undefined
          valA = (metaA?.flow_type ?? '').toLowerCase()
          valB = (metaB?.flow_type ?? '').toLowerCase()
        } else if (sortKey === 'status') {
          valA = a.status
          valB = b.status
        } else if (sortKey === 'allocated_by') {
          valA = (traders.find((t) => t.id === a.allocated_by)?.name ?? '').toLowerCase()
          valB = (traders.find((t) => t.id === b.allocated_by)?.name ?? '').toLowerCase()
        }
        if (valA < valB) return sortDir === 'asc' ? -1 : 1
        if (valA > valB) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }
    return result
  }, [allocations, activeFlow, sortKey, sortDir, traders])

  const fields: FieldDefinition[] = [
    { key: 'flow_type', label: '자금 흐름', type: 'select', required: true,
      options: getFlowOptions(currentUser?.role) },
    { key: 'trader_id', label: '수취 트레이더', type: 'select', required: true,
      options: traders.filter((t) => t.role !== 'admin' && t.status === 'active').map((t) => `${t.id}::${t.name}`) },
    { key: 'amount_usd', label: '할당 금액 (USD)', type: 'number', required: true },
    { key: 'memo', label: '메모', type: 'text', required: false },
  ]

  const handleSubmit = (values: Record<string, string>) => {
    const trader_id = values.trader_id.split('::')[0]
    const flow_type = values.flow_type.split('::')[0]
    insertAllocation.mutate(
      {
        trader_id,
        allocated_by: currentUser?.id,
        amount_usd: parseFloat(values.amount_usd),
        memo: values.memo || null,
        metadata: { flow_type },
      },
      { onSuccess: () => setIsModalOpen(false) }
    )
  }

  const handleEdit = (values: Record<string, string>) => {
    if (!editTarget) return
    const trader_id = values.trader_id.split('::')[0]
    const flow_type = values.flow_type.split('::')[0]
    updateAllocation.mutate(
      {
        id: editTarget.id,
        trader_id,
        amount_usd: parseFloat(values.amount_usd),
        memo: values.memo || null,
        metadata: { flow_type },
      },
      { onSuccess: () => setEditTarget(null) }
    )
  }

  const handleDelete = (alloc: Allocation) => {
    const traderName = traders.find((t) => t.id === alloc.trader_id)?.name ?? '-'
    if (window.confirm(`"${traderName}" 에게 할당된 ${formatUSD(alloc.amount_usd)} 를 삭제하시겠습니까?`)) {
      deleteAllocation.mutate(alloc.id)
    }
  }

  // 수정 모달용 초기값 생성
  const getEditInitialValues = (alloc: Allocation): Record<string, string> => {
    const meta = alloc.metadata as Record<string, string> | undefined
    const flowType = meta?.flow_type ?? ''
    // flow_type을 options에서 찾아 value::label 형태로 복원
    const flowOption = fields[0].options?.find((o) => o.split('::')[0] === flowType) ?? flowType
    const traderOption = fields[1].options?.find((o) => o.split('::')[0] === alloc.trader_id) ?? alloc.trader_id
    return {
      flow_type: flowOption,
      trader_id: traderOption,
      amount_usd: alloc.amount_usd,
      memo: alloc.memo ?? '',
    }
  }

  const columns = [
    { key: 'flow_type', header: '자금 흐름',
      render: (row: Allocation) => {
        const meta = row.metadata as Record<string, string> | undefined
        return meta?.flow_type ? <FlowBadge flow={meta.flow_type} /> : <span className="text-xs text-muted">-</span>
      },
    },
    { key: 'trader_id', header: '트레이더',
      render: (row: Allocation) => traders.find((t: Trader) => t.id === row.trader_id)?.name ?? '-',
    },
    { key: 'amount_usd', header: '할당 금액', align: 'right' as const,
      render: (row: Allocation) => formatUSD(row.amount_usd),
    },
    { key: 'status', header: '상태',
      render: (row: Allocation) => <StatusBadge status={row.status} />,
    },
    { key: 'source', header: '출처',
      render: (row: Allocation) => {
        const meta = row.metadata as Record<string, string> | undefined
        return meta?.source === 'transfer'
          ? <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">이체원장</span>
          : <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">수동</span>
      },
    },
    { key: 'allocated_by', header: '등록자',
      render: (row: Allocation) => traders.find((t: Trader) => t.id === row.allocated_by)?.name ?? '-',
    },
    { key: 'created_at', header: '등록일',
      render: (row: Allocation) => new Date(row.created_at).toLocaleDateString('ko-KR'),
    },
    ...(canEdit ? [{
      key: 'actions', header: '액션',
      render: (row: Allocation) => (
        <div className="flex gap-2">
          <button
            onClick={() => setEditTarget(row)}
            className="text-xs text-accent hover:text-accent-hover"
          >
            수정
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="text-xs text-danger hover:text-red-400"
          >
            삭제
          </button>
        </div>
      ),
    }] : []),
  ]

  const { totalAUM, headFund, traderList, totalTraderFunds, totalAdjusted } = fundSummary
  const totalPnLNum = parseFloat(totalRealizedPnL)
  const allFunds = headFund + totalTraderFunds

  return (
    <DashboardLayout>
      <PageHeader
        title="펀드 운용"
        description="자금 배분 및 운용 현황 트래킹"
        action={canEdit ? { label: '자금 배분', onClick: () => setIsModalOpen(true) } : undefined}
      />

      {/* 상단 4카드: 전체 AUM / Head Fund / Trader Funds / 실현 P&L */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-5">
          <p className="text-xs text-muted mb-1">전체 운용자산 (AUM)</p>
          <p className="text-2xl font-bold text-foreground">{formatUSD(String(totalAUM.toFixed(1)))}</p>
          <p className="text-xs text-muted mt-2">{traderList.length}명 운용 중</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-muted mb-1">Head Fund</p>
          <p className="text-2xl font-bold text-blue-400">{formatUSD(String(headFund.toFixed(1)))}</p>
          <div className="mt-2 h-2 bg-card-border/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: allFunds > 0 ? `${(headFund / allFunds) * 100}%` : '0%' }}
            />
          </div>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-muted mb-1">Trader Funds (할당)</p>
          <p className="text-2xl font-bold text-emerald-400">{formatUSD(String(totalTraderFunds.toFixed(1)))}</p>
          <p className="text-xs text-muted mt-1">
            P&L 반영: <span className="font-semibold text-foreground">{formatUSD(String(totalAdjusted.toFixed(1)))}</span>
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-muted mb-1">누적 실현 P&L</p>
          <p className={`text-2xl font-bold ${totalPnLNum >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPnLNum >= 0 ? '+' : ''}{formatUSD(totalRealizedPnL)}
          </p>
          <p className="text-xs text-muted mt-1">종료 포지션 확정 수익/손실</p>
        </div>
      </div>

      {/* 자금 흐름도: Head Fund → Trader별 분배 바 */}
      {traderList.length > 0 && (
        <div className="glass-card p-6 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Trader별 Fund 분배</h3>

          {/* 전체 비율 바 */}
          <div className="w-full h-8 rounded-lg overflow-hidden flex mb-4">
            {headFund > 0 && allFunds > 0 && (
              <div
                style={{ width: `${(headFund / allFunds) * 100}%` }}
                className="h-full bg-blue-500/60 relative"
                title={`Head Fund: ${formatUSD(String(headFund.toFixed(1)))}`}
              >
                {(headFund / allFunds) * 100 > 10 && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                    Head Fund
                  </span>
                )}
              </div>
            )}
            {traderList.map((ta, i) => {
              const pct = allFunds > 0 ? (ta.fund / allFunds) * 100 : 0
              if (pct < 0.5) return null
              return (
                <div
                  key={ta.id}
                  style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                  className="h-full relative"
                  title={`${ta.name}: ${formatUSD(String(ta.fund.toFixed(1)))} (${pct.toFixed(1)}%)`}
                >
                  {pct > 8 && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium truncate px-1">
                      {ta.name}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* 트레이더별 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {traderList.map((ta, i) => {
              const pct = totalTraderFunds > 0 ? (ta.fund / totalTraderFunds) * 100 : 0
              const color = COLORS[i % COLORS.length]
              return (
                <div key={ta.id} className="p-3 rounded-lg border border-card-border/50 bg-card-border/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-sm font-medium text-foreground">{ta.name}</span>
                    </div>
                    <span className="text-xs text-muted capitalize">{ta.role === 'head_trader' ? 'Head' : 'Trader'}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-lg font-bold text-foreground">{formatUSD(String(ta.adjustedFund.toFixed(1)))}</p>
                    {ta.pnl !== 0 && (
                      <span className={`text-xs font-medium ${ta.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {ta.pnl >= 0 ? '+' : ''}{formatUSD(String(ta.pnl.toFixed(1)))}
                        <span className="text-muted ml-1">({ta.pnl >= 0 ? '+' : ''}{ta.roi}%)</span>
                      </span>
                    )}
                  </div>
                  {ta.pnl !== 0 && (
                    <p className="text-xs text-muted mt-0.5">원금: {formatUSD(String(ta.fund.toFixed(1)))}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-card-border/30 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-xs text-muted">{pct.toFixed(1)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 자금 흐름 필터 */}
      <FlowFilter flows={flows} activeFlow={activeFlow} onSelect={setActiveFlow} />

      {/* 할당 내역 테이블 (정렬 가능) */}
      {isLoading ? (
        <div className="glass-card p-8 text-center text-muted text-sm">데이터 로딩 중...</div>
      ) : filteredAllocations.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted text-sm">데이터가 없습니다.</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-card-border">
                  {columns.map((col) => {
                    const sortable = ['flow_type', 'trader_id', 'amount_usd', 'status', 'allocated_by', 'created_at'].includes(col.key)
                    return (
                      <th
                        key={col.key}
                        className={`px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider whitespace-nowrap
                          ${col.align === 'right' ? 'text-right' : 'text-left'}
                          ${sortable ? 'cursor-pointer hover:text-foreground transition-colors' : ''}`}
                        onClick={() => sortable && handleSort(col.key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.header}
                          {sortable && (
                            sortKey === col.key
                              ? <span className="text-accent">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
                              : <span className="opacity-30">{'\u25B2'}</span>
                          )}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`border-b border-card-border/50 transition-colors ${i % 2 === 0 ? '' : 'bg-card-border/5'}`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-sm ${col.align === 'right' ? 'text-right font-mono' : 'text-left'}`}
                      >
                        {col.render ? col.render(row) : String((row as unknown as Record<string, unknown>)[col.key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 신규 배분 모달 */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="자금 배분">
        <DynamicForm
          fields={fields}
          onSubmit={handleSubmit}
          submitLabel="할당"
          isLoading={insertAllocation.isPending}
        />
      </Modal>

      {/* 수정 모달 */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="자금 배분 수정">
        {editTarget && (
          <DynamicForm
            fields={fields}
            initialValues={getEditInitialValues(editTarget)}
            onSubmit={handleEdit}
            submitLabel="수정"
            isLoading={updateAllocation.isPending}
          />
        )}
      </Modal>
    </DashboardLayout>
  )
}
