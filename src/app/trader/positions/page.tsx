'use client'

import { useState, useMemo, useCallback } from 'react'
import Decimal from 'decimal.js'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Modal } from '@/components/ui/modal'
import { DynamicForm } from '@/components/forms/dynamic-form'
import { useAuthStore } from '@/lib/store'
import { usePositions, useAccounts, useUpdate } from '@/lib/hooks/use-data'
import { formatUSDTInt } from '@/lib/calculations'
import { groupPositions } from '@/lib/position-groups'
import type { PositionGroup } from '@/lib/position-groups'
import type { Position, Account, FieldDefinition } from '@/types/database'

const leverages = ['10x', '20x', '25x', '30x', '35x', '40x', '45x', '50x']

export default function TraderPositionsPage() {
  const trader = useAuthStore((s) => s.trader)
  const [editTarget, setEditTarget] = useState<Position | null>(null)
  const { data: positions = [], isLoading } = usePositions(trader?.id, 'active')
  const { data: accounts = [] } = useAccounts(trader?.id)
  const updatePosition = useUpdate<Record<string, unknown>>('positions', ['positions'])

  const positionGroups = useMemo(() => groupPositions(positions), [positions])

  // ── 계정별 그룹화 ──
  const accountGroups = useMemo(() => {
    const map = new Map<string, PositionGroup[]>()
    for (const group of positionGroups) {
      const accountId = group.positions[0].account_id
      const existing = map.get(accountId) ?? []
      map.set(accountId, [...existing, group])
    }
    return Array.from(map.entries()).map(([accountId, groups]) => {
      const a = accounts.find((ac) => ac.id === accountId)
      const meta = a?.metadata as Record<string, string> | undefined
      const email = meta?.gmail || a?.alias || '-'
      const label = email.includes('@') ? email.split('@')[0] : email
      const exchange = a?.exchange ?? '-'
      return { accountId, label, exchange, groups }
    })
  }, [positionGroups, accounts])

  // ── 수정 폼 필드 ──
  const editFields: FieldDefinition[] = [
    { key: 'direction', label: '방향', type: 'select', required: true, options: ['long', 'short'] },
    { key: 'closing_balance_usd', label: '종료 잔고 (USDT)', type: 'number', required: false },
    { key: 'exit_date', label: '종료 날짜', type: 'date', required: false },
    { key: 'leverage', label: '레버리지', type: 'select', required: false, options: leverages },
    { key: 'entry_date', label: '진입 날짜', type: 'date', required: false },
    { key: 'issue_note', label: '이슈 / 특이점', type: 'text', required: false },
  ]

  const handleEdit = (values: Record<string, string>) => {
    if (!editTarget) return
    updatePosition.mutate(
      {
        id: editTarget.id,
        direction: values.direction,
        closing_balance_usd: values.closing_balance_usd ? parseFloat(values.closing_balance_usd) : null,
        exit_date: values.exit_date || null,
        leverage: values.leverage || editTarget.leverage,
        entry_date: values.entry_date || null,
        issue_note: values.issue_note || null,
      },
      { onSuccess: () => setEditTarget(null) }
    )
  }

  // ── 상태 변경 (종료 시 그룹 전체) ──
  const handleStatusChange = useCallback((group: PositionGroup, newStatus: string) => {
    if (newStatus === 'closed') {
      if (!window.confirm('포지션을 종료하시겠습니까?\n종료된 포지션은 히스토리로 이동됩니다.')) return
    }
    group.positions.forEach((p) => {
      updatePosition.mutate({ id: p.id, status: newStatus })
    })
  }, [updatePosition])

  // ── 헬퍼 ──
  const renderExchange = (pos: Position) => {
    const meta = pos.metadata as Record<string, string> | undefined
    const a = accounts.find((ac: Account) => ac.id === pos.account_id)
    return meta?.exchange || a?.exchange || '-'
  }

  const renderPnl = (pnl: string | null) => {
    if (!pnl) return '-'
    const n = parseFloat(pnl)
    return <span className={n >= 0 ? 'pnl-positive' : 'pnl-negative'}>{formatUSDTInt(pnl)}</span>
  }

  const renderRoi = (roi: string | null) => {
    if (!roi) return '-'
    const n = parseFloat(roi)
    return <span className={n >= 0 ? 'pnl-positive' : 'pnl-negative'}>{n >= 0 ? '+' : ''}{roi}%</span>
  }

  // ── 읽기전용 셀 ──
  const renderCells = (pos: Position) => (
    <>
      <td className={tdClass('left')}>
        <span className="text-sm">{pos.entry_date ?? '-'}</span>
      </td>
      <td className={tdClass('left')}>
        <span className={pos.direction === 'long' ? 'text-emerald-400 text-sm' : 'text-rose-400 text-sm'}>
          {(pos.direction || 'long').toUpperCase()}
        </span>
      </td>
      <td className={tdClass('left')}>
        <span className="text-sm">{pos.leverage || '-'}</span>
      </td>
      <td className={tdClass('left')}>
        <span className="text-sm">{pos.exit_date ?? '-'}</span>
      </td>
      <td className={tdClass('right')}>
        <span className="text-sm font-mono">{pos.closing_balance_usd ? formatUSDTInt(pos.closing_balance_usd) : '-'}</span>
      </td>
    </>
  )

  // ── 테이블 헤더 ──
  const headers = [
    { label: '거래소', align: 'left' },
    { label: '예치금', align: 'right' },
    { label: '진입일', align: 'left' },
    { label: '방향', align: 'left' },
    { label: '레버리지', align: 'left' },
    { label: '종료일', align: 'left' },
    { label: '종료잔고', align: 'right' },
    { label: 'P&L', align: 'right' },
    { label: 'ROI', align: 'right' },
    { label: '상태', align: 'left' },
    { label: '', align: 'left' },
  ]

  const thClass = (align: string) =>
    `px-3 py-3 text-xs font-medium text-muted uppercase tracking-wider whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`

  const mergedCellClass = (align: string) =>
    `px-3 py-3 text-sm align-middle ${align === 'right' ? 'text-right font-mono' : 'text-left'}`

  // ── 총 예치금 / P&L 요약 ──
  const summary = useMemo(() => {
    const totalDeposit = positions.reduce(
      (acc, p) => acc.plus(new Decimal(p.deposit_usd || '0')), new Decimal(0)
    )
    const totalPnl = positionGroups.reduce((acc, g) => {
      if (g.combinedPnl) return acc.plus(new Decimal(g.combinedPnl))
      return acc
    }, new Decimal(0))
    return { totalDeposit: totalDeposit.toFixed(0), totalPnl: totalPnl.toFixed(1) }
  }, [positions, positionGroups])

  return (
    <DashboardLayout>
      <PageHeader
        title="내 포지션"
        description="활성 포지션 조회 및 관리"
      />

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-4">
          <p className="text-xs text-muted mb-1">총 예치금</p>
          <p className="text-lg font-bold text-foreground">{formatUSDTInt(summary.totalDeposit)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted mb-1">실현 P&L</p>
          <p className={`text-lg font-bold ${parseFloat(summary.totalPnl) >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
            {formatUSDTInt(summary.totalPnl)}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-card p-8 text-center text-muted text-sm">데이터 로딩 중...</div>
      ) : accountGroups.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted text-sm">활성 포지션이 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {accountGroups.map((ag) => (
            <div key={ag.accountId} className="glass-card overflow-hidden">
              {/* 계정 헤더 */}
              <div className="px-4 py-3 border-b border-card-border bg-card-border/10 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-sm font-semibold text-foreground">{ag.label}</span>
                <span className="text-xs text-muted">({ag.exchange})</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-card-border/50">
                      {headers.map((h, i) => (
                        <th key={i} className={thClass(h.align)}>{h.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ag.groups.map((group, gi) => {
                      const first = group.positions[0]
                      const rowCount = group.positions.length

                      // ── 싱글 포지션 ──
                      if (group.type === 'single' || rowCount === 1) {
                        const pos = first
                        return (
                          <tr
                            key={pos.id}
                            className={`border-b border-card-border/30 ${gi % 2 !== 0 ? 'bg-card-border/5' : ''}`}
                          >
                            <td className={tdClass('left')}>{renderExchange(pos)}</td>
                            <td className={tdClass('right')}>{formatUSDTInt(pos.deposit_usd)}</td>
                            {renderCells(pos)}
                            <td className={tdClass('right')}>{renderPnl(group.combinedPnl)}</td>
                            <td className={tdClass('right')}>{renderRoi(group.combinedRoi)}</td>
                            <td className={tdClass('left')}>
                              <select
                                value={pos.status}
                                onChange={(e) => handleStatusChange(group, e.target.value)}
                                className={`text-xs font-medium px-2 py-1 rounded-lg border transition-colors cursor-pointer
                                  ${pos.status === 'active'
                                    ? 'bg-emerald-900 border-emerald-600 text-emerald-300'
                                    : 'bg-gray-800 border-gray-600 text-gray-300'
                                  } focus:outline-none focus:border-accent`}
                              >
                                <option value="active" className="bg-gray-900 text-emerald-300">활성</option>
                                <option value="closed" className="bg-gray-900 text-gray-300">종료</option>
                              </select>
                            </td>
                            <td className={tdClass('left')}>
                              <button onClick={() => setEditTarget(pos)} className="text-xs text-accent hover:text-accent-hover">수정</button>
                            </td>
                          </tr>
                        )
                      }

                      // ── 델타뉴트럴 페어 ──
                      return group.positions.map((pos, pi) => {
                        const isFirst = pi === 0
                        const pairLabel = (pos.metadata as Record<string, string> | undefined)?.pair
                        return (
                          <tr
                            key={pos.id}
                            className={`border-b ${pi === rowCount - 1 ? 'border-card-border/50' : 'border-card-border/20'}
                              ${gi % 2 !== 0 ? 'bg-card-border/5' : ''}
                              ${isFirst ? 'border-t border-accent/20' : ''}`}
                          >
                            {/* 거래소 + 페어 라벨 */}
                            <td className={tdClass('left')}>
                              <div className="flex items-center gap-1">
                                <span>{renderExchange(pos)}</span>
                                {pairLabel && (
                                  <span className={`text-[9px] px-1 py-0.5 rounded font-bold
                                    ${pairLabel === 'A' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                    {pairLabel}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 예치금 */}
                            <td className={tdClass('right')}>{formatUSDTInt(pos.deposit_usd)}</td>

                            {renderCells(pos)}

                            {/* 공유 컬럼: P&L, ROI, 상태 */}
                            {isFirst && (
                              <>
                                <td className={mergedCellClass('right')} rowSpan={rowCount}>
                                  {renderPnl(group.combinedPnl)}
                                </td>
                                <td className={mergedCellClass('right')} rowSpan={rowCount}>
                                  {renderRoi(group.combinedRoi)}
                                </td>
                                <td className={mergedCellClass('left')} rowSpan={rowCount}>
                                  <select
                                    value={first.status}
                                    onChange={(e) => handleStatusChange(group, e.target.value)}
                                    className={`text-xs font-medium px-2 py-1 rounded-lg border transition-colors cursor-pointer
                                      ${first.status === 'active'
                                        ? 'bg-emerald-900 border-emerald-600 text-emerald-300'
                                        : 'bg-gray-800 border-gray-600 text-gray-300'
                                      } focus:outline-none focus:border-accent`}
                                  >
                                    <option value="active" className="bg-gray-900 text-emerald-300">활성</option>
                                    <option value="closed" className="bg-gray-900 text-gray-300">종료</option>
                                  </select>
                                </td>
                              </>
                            )}
                            <td className={tdClass('left')}>
                              <button onClick={() => setEditTarget(pos)} className="text-xs text-accent hover:text-accent-hover">수정</button>
                            </td>
                          </tr>
                        )
                      })
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* 수정 모달 */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="포지션 수정">
        {editTarget && (
          <div className="space-y-3">
            <div className="text-sm text-muted">
              {renderExchange(editTarget)} · {(editTarget.direction || 'long').toUpperCase()} · 예치금 {formatUSDTInt(editTarget.deposit_usd)}
            </div>
            <DynamicForm
              fields={editFields}
              initialValues={{
                direction: editTarget.direction ?? 'long',
              closing_balance_usd: editTarget.closing_balance_usd ?? '',
                exit_date: editTarget.exit_date ?? '',
                leverage: editTarget.leverage ?? '',
                entry_date: editTarget.entry_date ?? '',
                issue_note: editTarget.issue_note ?? '',
              }}
              onSubmit={handleEdit}
              submitLabel="수정"
              isLoading={updatePosition.isPending}
            />
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}

const tdClass = (align: string) =>
  `px-3 py-2 text-sm whitespace-nowrap ${align === 'right' ? 'text-right font-mono' : 'text-left'}`
