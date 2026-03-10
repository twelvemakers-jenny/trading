'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { Modal } from '@/components/ui/modal'
import { FlowBadge, FlowFilter, getFlowsByRole } from '@/components/ui/flow-badge'
import { TransferForm, getAccountEmail, PURPOSE_LABELS } from '@/components/forms/transfer-form'
import { useTransfers, useTraders, useAccounts, useAllocations, useInsert, useUpdate, useDelete, useExchanges } from '@/lib/hooks/use-data'
import { useTraderPnL } from '@/lib/hooks/use-trader-pnl'
import { useAuthStore } from '@/lib/store'
import { formatUSD, formatUSDT } from '@/lib/calculations'
import type { Transfer, Trader, Account, UserRole } from '@/types/database'


function ExchangeBadge({ name, colorMap }: { name: string; colorMap?: Record<string, string> }) {
  const color = colorMap?.[name] ?? '#6b7280'
  return (
    <span
      className="text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {name}
    </span>
  )
}

export default function TransfersPage() {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Transfer | null>(null)
  const [activeFlow, setActiveFlow] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const currentUser = useAuthStore((s) => s.trader)
  const { data: transfers = [], isLoading } = useTransfers()
  const { data: traders = [] } = useTraders()
  const { data: accounts = [] } = useAccounts()
  const { data: allocations = [] } = useAllocations()
  const insertTransfer = useInsert<Record<string, unknown>>('transfers', ['transfers', 'allocations'])
  const updateTransfer = useUpdate<Record<string, unknown>>('transfers', ['transfers'])
  const deleteTransfer = useDelete('transfers', ['transfers'])
  const { totalPnL: totalRealizedPnL } = useTraderPnL()
  const { exchangeNames, exchangeColors } = useExchanges()
  const insertPosition = useInsert<Record<string, unknown>>('positions', ['positions'])
  const insertAllocation = useInsert<Record<string, unknown>>('allocations', ['allocations'])

  // 상태 변경: 대기 → 진행 시 포지션 2개 자동 생성 (delta-neutral)
  const handleStatusChange = (transfer: Transfer, newStatus: string) => {
    updateTransfer.mutate(
      { id: transfer.id, status: newStatus },
      {
        onSuccess: () => {
          if (newStatus === 'completed') {
            const meta = transfer.metadata as Record<string, string> | undefined
            const exA = meta?.exchange_a ?? ''
            const exB = meta?.exchange_b ?? ''
            const amtA = meta?.amount_a ? parseFloat(meta.amount_a) : parseFloat(transfer.amount_usd) / 2
            const amtB = meta?.amount_b ? parseFloat(meta.amount_b) : parseFloat(transfer.amount_usd) / 2

            // 거래소 A 포지션
            insertPosition.mutate({
              trader_id: transfer.trader_id,
              account_id: transfer.account_id,
              deposit_usd: amtA,
              direction: 'long',
              leverage: '10x',
              entry_date: transfer.transfer_date,
              status: 'active',
              issue_note: `Delta-Neutral A (${exA})`,
              metadata: { flow_type: meta?.flow_type ?? '', exchange: exA, source_transfer_id: transfer.id, pair: 'A' },
            })

            // 거래소 B 포지션
            insertPosition.mutate({
              trader_id: transfer.trader_id,
              account_id: transfer.account_id,
              deposit_usd: amtB,
              direction: 'short',
              leverage: '10x',
              entry_date: transfer.transfer_date,
              status: 'active',
              issue_note: `Delta-Neutral B (${exB})`,
              metadata: { flow_type: meta?.flow_type ?? '', exchange: exB, source_transfer_id: transfer.id, pair: 'B' },
            })

            // 포지션 생성 후 포지션관리 페이지로 이동
            router.push('/admin/positions')
          }
        },
      }
    )
  }

  const flows = getFlowsByRole(currentUser?.role)

  // ── 상단 시각화: 역할별 펀드 계산 ──
  const isAdmin = currentUser?.role === 'admin'
  const isHeadTrader = currentUser?.role === 'head_trader'

  const calcFund = (traderFilter?: string) => {
    const activeAlloc = allocations.filter((a) => {
      if (a.status !== 'active') return false
      if (traderFilter) return a.trader_id === traderFilter
      return true
    })
    let fund = 0
    for (const alloc of activeAlloc) {
      const meta = alloc.metadata as Record<string, string> | undefined
      const flow = meta?.flow_type ?? ''
      const amount = parseFloat(alloc.amount_usd)
      if (flow === 'head_to_trader' || flow === 'exchange_to_trader' || !flow) fund += amount
      if (flow === 'trader_to_exchange' || flow === 'trader_to_head') fund -= amount
    }
    return fund
  }

  const calcExchangeSummary = (traderFilter?: string) => {
    const exchangeMap = new Map<string, number>()
    const filtered = traderFilter
      ? transfers.filter((t) => t.trader_id === traderFilter)
      : transfers
    for (const t of filtered) {
      if (t.status === 'cancelled') continue
      const meta = t.metadata as Record<string, string> | undefined
      const purpose = t.purpose
      const sign = purpose === 'withdrawal' || purpose === 'profit_withdrawal' ? -1 : 1

      if (meta?.exchange_a && meta?.amount_a) {
        const prev = exchangeMap.get(meta.exchange_a) ?? 0
        exchangeMap.set(meta.exchange_a, prev + parseFloat(meta.amount_a) * sign)
      }
      if (meta?.exchange_b && meta?.amount_b) {
        const prev = exchangeMap.get(meta.exchange_b) ?? 0
        exchangeMap.set(meta.exchange_b, prev + parseFloat(meta.amount_b) * sign)
      }
      if (!meta?.exchange_a && !meta?.exchange_b) {
        const account = accounts.find((a) => a.id === t.account_id)
        const ex = meta?.exchange || account?.exchange
        if (ex) {
          const prev = exchangeMap.get(ex) ?? 0
          exchangeMap.set(ex, prev + parseFloat(t.amount_usd) * sign)
        }
      }
    }
    return Array.from(exchangeMap.entries())
      .map(([exchange, amount]) => ({ exchange, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4)
  }

  const { totalFund, myFund, exchangeSummary } = useMemo(() => {
    // Admin: 전체 합산
    if (isAdmin) {
      return {
        totalFund: calcFund(),
        myFund: null,
        exchangeSummary: calcExchangeSummary(),
      }
    }
    // Head Trader: 전체 합산 + 본인 펀드
    if (isHeadTrader && currentUser?.id) {
      return {
        totalFund: calcFund(),
        myFund: calcFund(currentUser.id),
        exchangeSummary: calcExchangeSummary(currentUser.id),
      }
    }
    // Trader (fallback): 본인만
    return {
      totalFund: null,
      myFund: calcFund(currentUser?.id),
      exchangeSummary: calcExchangeSummary(currentUser?.id),
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocations, transfers, accounts, currentUser?.id, currentUser?.role])

  const filteredTransfers = useMemo(() => {
    let result = transfers
    // 기본: 진행(completed) 상태 숨김
    if (!showCompleted) {
      result = result.filter((t) => t.status !== 'completed')
    }
    if (activeFlow) {
      result = result.filter((t) => {
        const meta = t.metadata as Record<string, string> | undefined
        return meta?.flow_type === activeFlow
      })
    }
    return result
  }, [transfers, activeFlow, showCompleted])

  const completedCount = useMemo(
    () => transfers.filter((t) => t.status === 'completed').length,
    [transfers]
  )

  // ── 테이블 컬럼 (delta-neutral: 거래소/금액 2줄 표시) ──
  const columns = [
    { key: 'flow_type', header: '흐름',
      render: (row: Transfer) => {
        const meta = row.metadata as Record<string, string> | undefined
        return meta?.flow_type ? <FlowBadge flow={meta.flow_type} size="sm" /> : <span className="text-xs text-muted">-</span>
      },
    },
    { key: 'transfer_date', header: '이체일' },
    { key: 'trader_id', header: '트레이더',
      render: (row: Transfer) => traders.find((t: Trader) => t.id === row.trader_id)?.name ?? '-',
    },
    { key: 'account_id', header: '계정',
      render: (row: Transfer) => {
        const a = accounts.find((a: Account) => a.id === row.account_id)
        if (!a) return '-'
        const email = getAccountEmail(a)
        return email.includes('@') ? email.split('@')[0] : email
      },
    },
    { key: 'exchanges', header: '거래소 / 이체금액',
      render: (row: Transfer) => {
        const meta = row.metadata as Record<string, string> | undefined
        // delta-neutral: 2거래소 표시
        if (meta?.exchange_a && meta?.exchange_b) {
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ExchangeBadge name={meta.exchange_a} colorMap={exchangeColors} />
                <span className="text-xs font-mono text-foreground">{formatUSDT(meta.amount_a ?? '0')}</span>
              </div>
              <div className="flex items-center gap-2">
                <ExchangeBadge name={meta.exchange_b} colorMap={exchangeColors} />
                <span className="text-xs font-mono text-foreground">{formatUSDT(meta.amount_b ?? '0')}</span>
              </div>
            </div>
          )
        }
        // 기존 단일 거래소 호환
        const a = accounts.find((a: Account) => a.id === row.account_id)
        const exchange = meta?.exchange || a?.exchange || '-'
        return (
          <div className="flex items-center gap-2">
            <ExchangeBadge name={exchange} colorMap={exchangeColors} />
            <span className="text-xs font-mono text-foreground">{formatUSDT(row.amount_usd)}</span>
          </div>
        )
      },
    },
    { key: 'amount_total', header: '합계', align: 'right' as const,
      render: (row: Transfer) => formatUSDT(row.amount_usd),
    },
    { key: 'purpose', header: '목적',
      render: (row: Transfer) => (
        <span className="text-xs">{PURPOSE_LABELS[row.purpose] ?? row.purpose}</span>
      ),
    },
    { key: 'status', header: '상태',
      render: (row: Transfer) => (
        <select
          value={row.status}
          onChange={(e) => handleStatusChange(row, e.target.value)}
          className={`text-xs font-medium px-2 py-1 rounded-lg border transition-colors cursor-pointer
            ${row.status === 'completed'
              ? 'bg-emerald-900 border-emerald-600 text-emerald-300'
              : 'bg-yellow-900 border-yellow-600 text-yellow-300'
            } focus:outline-none focus:border-accent`}
        >
          <option value="pending" className="bg-gray-900 text-yellow-300">대기</option>
          <option value="completed" className="bg-gray-900 text-emerald-300">진행</option>
        </select>
      ),
    },
    { key: 'actions', header: '',
      render: (row: Transfer) => (
        <div className="flex gap-2">
          <button onClick={() => setEditTarget(row)} className="text-xs text-accent hover:text-accent-hover">수정</button>
          <button
            onClick={() => {
              if (window.confirm('이 이체 내역을 삭제하시겠습니까?')) {
                deleteTransfer.mutate(row.id)
              }
            }}
            className="text-xs text-danger hover:text-red-400"
          >삭제</button>
        </div>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <PageHeader
        title="이체 원장"
        description="Delta-Neutral 자금 이체 관리"
        action={{ label: '이체 등록', onClick: () => setIsModalOpen(true) }}
      />

      {/* 상단 시각화 — 역할별 분기 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* 펀드 카드 영역 */}
        <div className={`lg:col-span-1 ${isHeadTrader ? 'space-y-3' : ''}`}>
          {/* Admin: 전체 분배 펀드 / Head Trader: 헤드 펀드 총액 */}
          {totalFund !== null && (
            <div className="glass-card p-6 flex flex-col justify-center">
              <p className="text-xs text-muted mb-2">
                {isAdmin ? '전체 분배 펀드' : '헤드 펀드 총액'}
              </p>
              <p className="text-3xl font-bold text-foreground">
                {formatUSD(String(totalFund.toFixed(1)))}
              </p>
              {isAdmin && parseFloat(totalRealizedPnL) !== 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted">실현 P&L:</span>
                  <span className={`text-sm font-semibold ${parseFloat(totalRealizedPnL) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {parseFloat(totalRealizedPnL) >= 0 ? '+' : ''}{formatUSD(totalRealizedPnL)}
                  </span>
                </div>
              )}
              <p className="text-xs text-muted mt-1">
                {traders.filter((t) => t.role !== 'admin' && t.status === 'active').length}명 트레이더
              </p>
            </div>
          )}

          {/* Head Trader: 내 트레이더 펀드 / Trader: 내 분배 펀드 */}
          {myFund !== null && (
            <div className="glass-card p-6 flex flex-col justify-center">
              <p className="text-xs text-muted mb-2">
                {isHeadTrader ? '내 트레이더 펀드' : '내 분배 펀드'}
              </p>
              <p className={`font-bold text-foreground ${isHeadTrader ? 'text-2xl' : 'text-3xl'}`}>
                {formatUSD(String(myFund.toFixed(1)))}
              </p>
            </div>
          )}
        </div>

        {/* 거래소별 요약 */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
          {exchangeSummary.map(({ exchange, amount }) => (
            <div key={exchange} className="glass-card p-4 relative overflow-hidden">
              <div
                className="absolute top-0 left-0 w-1 h-full"
                style={{ backgroundColor: exchangeColors[exchange] ?? '#6b7280' }}
              />
              <p className="text-xs text-muted mb-1 pl-2">{exchange}</p>
              <p className="text-lg font-bold text-foreground pl-2">
                {formatUSDT(String(amount.toFixed(1)))}
              </p>
            </div>
          ))}
          {exchangeSummary.length === 0 && (
            <div className="col-span-4 glass-card p-4 text-center text-muted text-sm">
              이체 내역이 없습니다.
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <FlowFilter flows={flows} activeFlow={activeFlow} onSelect={setActiveFlow} />
        {completedCount > 0 && (
          <button
            onClick={() => setShowCompleted((prev) => !prev)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 -mt-4
              ${showCompleted
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-card-border/20 border-card-border text-muted hover:text-foreground'
              }`}
          >
            {showCompleted ? `진행 완료 숨기기` : `진행 완료 보기 (${completedCount})`}
          </button>
        )}
      </div>
      <DataTable columns={columns} data={filteredTransfers} isLoading={isLoading} />

      {/* 등록 모달 */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="이체 등록 (Delta-Neutral)">
        <TransferForm
          traders={traders}
          accounts={accounts}
          currentUserRole={currentUser?.role}
          exchangeNames={exchangeNames}
          onSubmit={(payload) => {
            insertTransfer.mutate(payload, {
              onSuccess: () => {
                // 이체 기록을 펀드 운용에도 자동 반영
                const meta = payload.metadata as Record<string, string> | undefined
                const flowType = meta?.flow_type ?? 'trader_to_exchange'
                insertAllocation.mutate({
                  trader_id: payload.trader_id,
                  allocated_by: currentUser?.id,
                  amount_usd: parseFloat(String(payload.amount_usd)),
                  memo: `이체원장 자동기록 (${meta?.exchange_a ?? ''}/${meta?.exchange_b ?? ''})`,
                  status: 'active',
                  metadata: { flow_type: flowType, source: 'transfer' },
                })
                setIsModalOpen(false)
              },
            })
          }}
          isLoading={insertTransfer.isPending}
          submitLabel="등록"
        />
      </Modal>

      {/* 수정 모달 */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="이체 수정">
        {editTarget && (
          <TransferForm
            traders={traders}
            accounts={accounts}
            currentUserRole={currentUser?.role}
            exchangeNames={exchangeNames}
            initialValues={editTarget}
            onSubmit={(payload) => {
              updateTransfer.mutate(
                { id: editTarget.id, ...payload },
                { onSuccess: () => setEditTarget(null) }
              )
            }}
            isLoading={updateTransfer.isPending}
            submitLabel="수정"
          />
        )}
      </Modal>
    </DashboardLayout>
  )
}

