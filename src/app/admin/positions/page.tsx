'use client'

import { useState, useMemo, useCallback } from 'react'
import Decimal from 'decimal.js'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Modal } from '@/components/ui/modal'
import { DynamicForm } from '@/components/forms/dynamic-form'
import { FlowBadge, FlowFilter, getFlowsByRole, getFlowOptions } from '@/components/ui/flow-badge'
import { InlineDollar, InlineUSDT, InlineDate, InlineSelect } from '@/components/ui/inline-edit'
import { usePositions, useTraders, useAccounts, useInsert, useUpdate, useDelete } from '@/lib/hooks/use-data'
import { useAuthStore } from '@/lib/store'
import { formatUSD, formatUSDT, formatUSDTInt, formatDollar, stripFormat } from '@/lib/calculations'
import { groupPositions } from '@/lib/position-groups'
import type { PositionGroup } from '@/lib/position-groups'
import type { Position, Trader, Account, FieldDefinition } from '@/types/database'

const leverages = ['10x', '20x', '25x', '30x', '35x', '40x', '45x', '50x']


// ── 메인 페이지 ──

export default function PositionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeFlow, setActiveFlow] = useState<string | null>(null)
  const currentUser = useAuthStore((s) => s.trader)
  const { data: positions = [], isLoading } = usePositions(undefined, 'active')
  const { data: traders = [] } = useTraders()
  const { data: accounts = [] } = useAccounts()
  const insertPosition = useInsert<Record<string, unknown>>('positions', ['positions'])
  const updatePosition = useUpdate<Record<string, unknown>>('positions', ['positions'])
  const deletePosition = useDelete('positions', ['positions'])

  const flows = getFlowsByRole(currentUser?.role)

  const filteredPositions = useMemo(() => {
    if (!activeFlow) return positions
    return positions.filter((p) => {
      const meta = p.metadata as Record<string, string> | undefined
      return meta?.flow_type === activeFlow
    })
  }, [positions, activeFlow])

  const positionGroups = useMemo(() => groupPositions(filteredPositions), [filteredPositions])

  // ── 인라인 업데이트 핸들러 ──
  const updateField = useCallback((pos: Position, field: string, value: unknown) => {
    updatePosition.mutate({ id: pos.id, [field]: value })
  }, [updatePosition])

  const updateMeta = useCallback((pos: Position, key: string, value: unknown) => {
    const prevMeta = pos.metadata as Record<string, unknown>
    updatePosition.mutate({ id: pos.id, metadata: { ...prevMeta, [key]: value } })
  }, [updatePosition])

  // ── 신규 등록 필드 ──
  const fields: FieldDefinition[] = [
    { key: 'flow_type', label: '자금 흐름', type: 'select', required: true,
      options: getFlowOptions(currentUser?.role) },
    { key: 'trader_id', label: '트레이더', type: 'select', required: true,
      options: traders.filter((t) => t.role !== 'admin' && t.status === 'active').map((t) => `${t.id}::${t.name}`) },
    { key: 'account_id', label: '계정', type: 'select', required: true,
      options: accounts.filter((a) => a.trader_id).map((a) => {
        const meta = a.metadata as Record<string, string>
        const email = meta?.gmail || a.alias
        return `${a.id}::${email} (${a.exchange})`
      }) },
    { key: 'deposit_usd', label: '예치금 (USDT)', type: 'number', required: true },
    { key: 'reward', label: 'Reward (USDT)', type: 'number', required: false },
    { key: 'direction', label: '방향', type: 'select', required: true, options: ['long', 'short'] },
    { key: 'leverage', label: '레버리지', type: 'select', required: true, options: leverages },
    { key: 'tp', label: 'TP (Take Profit)', type: 'number', required: false },
    { key: 'sl', label: 'SL (Stop Loss)', type: 'number', required: false },
    { key: 'entry_date', label: '진입 날짜', type: 'date', required: false },
    { key: 'issue_note', label: '이슈 / 특이점', type: 'text', required: false },
  ]

  const handleSubmit = (values: Record<string, string>) => {
    const flow_type = values.flow_type.split('::')[0]
    insertPosition.mutate(
      {
        trader_id: values.trader_id.split('::')[0],
        account_id: values.account_id.split('::')[0],
        deposit_usd: parseFloat(values.deposit_usd),
        direction: values.direction,
        leverage: values.leverage,
        entry_date: values.entry_date || null,
        status: 'active',
        issue_note: values.issue_note || null,
        metadata: {
          flow_type,
          reward: values.reward || null,
          tp: values.tp || null,
          sl: values.sl || null,
        },
      },
      { onSuccess: () => setIsModalOpen(false) }
    )
  }

  const handleStatusChange = (pos: Position, newStatus: string) => {
    if (newStatus === 'closed') {
      const traderName = traders.find((t) => t.id === pos.trader_id)?.name ?? '-'
      if (!window.confirm(`"${traderName}" 포지션을 종료하시겠습니까?\n종료된 포지션은 히스토리로 이동됩니다.`)) return
    }
    updatePosition.mutate({ id: pos.id, status: newStatus })
  }

  const handleDelete = (pos: Position) => {
    const traderName = traders.find((t) => t.id === pos.trader_id)?.name ?? '-'
    if (window.confirm(`"${traderName}" 의 포지션 (${formatUSD(pos.deposit_usd)}) 을 삭제하시겠습니까?`)) {
      deletePosition.mutate(pos.id)
    }
  }

  const handleDeleteGroup = (group: PositionGroup) => {
    const first = group.positions[0]
    const traderName = traders.find((t) => t.id === first.trader_id)?.name ?? '-'
    const totalDeposit = group.positions.reduce(
      (acc, p) => acc.plus(new Decimal(p.deposit_usd || '0')), new Decimal(0)
    ).toFixed(1)
    if (window.confirm(`"${traderName}" 의 델타뉴트럴 포지션 (${formatUSDT(totalDeposit)}) 을 모두 삭제하시겠습니까?`)) {
      group.positions.forEach((p) => deletePosition.mutate(p.id))
    }
  }

  // ── 헬퍼: 읽기전용 셀 ──
  const renderFlow = (pos: Position) => {
    const meta = pos.metadata as Record<string, string> | undefined
    return meta?.flow_type
      ? <FlowBadge flow={meta.flow_type} size="sm" />
      : <span className="text-xs text-muted">-</span>
  }

  const renderTrader = (pos: Position) =>
    traders.find((t: Trader) => t.id === pos.trader_id)?.name ?? <span className="text-muted text-xs">없음</span>

  const renderAccount = (pos: Position) => {
    const a = accounts.find((ac: Account) => ac.id === pos.account_id)
    if (!a) return '-'
    const meta = a.metadata as Record<string, string>
    const email = meta?.gmail || a.alias
    return email.includes('@') ? email.split('@')[0] : email
  }

  const renderExchange = (pos: Position) => {
    const meta = pos.metadata as Record<string, string> | undefined
    const a = accounts.find((ac: Account) => ac.id === pos.account_id)
    return meta?.exchange || a?.exchange || '-'
  }

  const renderPnl = (pnl: string | null) => {
    if (!pnl) return '-'
    const n = parseFloat(pnl)
    return <span className={n >= 0 ? 'pnl-positive' : 'pnl-negative'}>{formatUSDT(pnl)}</span>
  }

  const renderRoi = (roi: string | null) => {
    if (!roi) return '-'
    const n = parseFloat(roi)
    return <span className={n >= 0 ? 'pnl-positive' : 'pnl-negative'}>{n >= 0 ? '+' : ''}{roi}%</span>
  }

  // ── 인라인 편집 셀 렌더러 ──
  const renderEditableCells = (pos: Position) => {
    const meta = pos.metadata as Record<string, string> | undefined
    return (
      <>
        {/* Reward */}
        <td className={tdClass('right')}>
          <InlineUSDT
            value={meta?.reward}
            integer
            onSave={(v) => updateMeta(pos, 'reward', v)}
          />
        </td>
        {/* 진입일 */}
        <td className={tdClass('left')}>
          <InlineDate
            value={pos.entry_date}
            onSave={(v) => updateField(pos, 'entry_date', v)}
          />
        </td>
        {/* 방향 */}
        <td className={tdClass('left')}>
          <InlineSelect
            value={pos.direction || 'long'}
            options={['long', 'short']}
            onSave={(v) => updateField(pos, 'direction', v)}
            renderLabel={(v) => (
              <span className={v === 'long' ? 'text-emerald-400' : 'text-rose-400'}>
                {v.toUpperCase()}
              </span>
            )}
          />
        </td>
        {/* 레버리지 */}
        <td className={tdClass('left')}>
          <InlineSelect
            value={pos.leverage || '10x'}
            options={leverages}
            onSave={(v) => updateField(pos, 'leverage', v)}
          />
        </td>
        {/* TP */}
        <td className={tdClass('right')}>
          <InlineDollar
            value={meta?.tp}
            onSave={(v) => updateMeta(pos, 'tp', v)}
          />
        </td>
        {/* SL */}
        <td className={tdClass('right')}>
          <InlineDollar
            value={meta?.sl}
            onSave={(v) => updateMeta(pos, 'sl', v)}
          />
        </td>
        {/* 종료일 */}
        <td className={tdClass('left')}>
          <InlineDate
            value={pos.exit_date}
            onSave={(v) => updateField(pos, 'exit_date', v)}
          />
        </td>
        {/* 종료자금 (정수) */}
        <td className={tdClass('right')}>
          <InlineUSDT
            value={pos.closing_balance_usd}
            integer
            onSave={(v) => updateField(pos, 'closing_balance_usd', v ? parseFloat(v) : null)}
          />
        </td>
      </>
    )
  }

  // ── 테이블 스타일 ──
  const headers = [
    { label: '흐름', align: 'left', compact: true },
    { label: '트레이더', align: 'left' },
    { label: '계정', align: 'left' },
    { label: '거래소', align: 'left' },
    { label: '예치금', align: 'right' },
    { label: 'Reward', align: 'right' },
    { label: '진입일', align: 'left' },
    { label: '방향', align: 'left' },
    { label: '레버리지', align: 'left' },
    { label: 'TP', align: 'right' },
    { label: 'SL', align: 'right' },
    { label: '종료일', align: 'left' },
    { label: '종료자금', align: 'right' },
    { label: 'P&L', align: 'right' },
    { label: 'ROI', align: 'right' },
    { label: '상태', align: 'left' },
    { label: '', align: 'left' },
  ]

  const thClass = (align: string, compact?: boolean) =>
    `${compact ? 'px-1.5 max-w-[40px]' : 'px-3'} py-3 text-xs font-medium text-muted uppercase tracking-wider whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`

  const mergedCellClass = (align: string) =>
    `px-3 py-3 text-sm align-middle ${align === 'right' ? 'text-right font-mono' : 'text-left'}`

  return (
    <DashboardLayout>
      <PageHeader
        title="포지션 관리"
        description="전체 포지션 조회 및 등록"
        action={{ label: '포지션 추가', onClick: () => setIsModalOpen(true) }}
      />

      <FlowFilter flows={flows} activeFlow={activeFlow} onSelect={setActiveFlow} />

      {isLoading ? (
        <div className="glass-card p-8 text-center text-muted text-sm">데이터 로딩 중...</div>
      ) : positionGroups.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted text-sm">데이터가 없습니다.</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-card-border">
                  {headers.map((h, i) => (
                    <th key={i} className={thClass(h.align, (h as { compact?: boolean }).compact)}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positionGroups.map((group, gi) => {
                  const first = group.positions[0]
                  const rowCount = group.positions.length

                  if (group.type === 'single' || rowCount === 1) {
                    const pos = first
                    return (
                      <tr
                        key={pos.id}
                        className={`border-b border-card-border/50 ${gi % 2 !== 0 ? 'bg-card-border/5' : ''}`}
                      >
                        <td className="px-1.5 py-2 max-w-[40px] overflow-hidden">{renderFlow(pos)}</td>
                        <td className={tdClass('left')}>{renderTrader(pos)}</td>
                        <td className={tdClass('left')}>{renderAccount(pos)}</td>
                        <td className={tdClass('left')}>{renderExchange(pos)}</td>
                        <td className={tdClass('right')}>{formatUSDTInt(pos.deposit_usd)}</td>
                        {renderEditableCells(pos)}
                        <td className={tdClass('right')}>{renderPnl(group.combinedPnl)}</td>
                        <td className={tdClass('right')}>{renderRoi(group.combinedRoi)}</td>
                        <td className={tdClass('left')}>
                          <select
                            value={pos.status}
                            onChange={(e) => handleStatusChange(pos, e.target.value)}
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
                          <button onClick={() => handleDelete(pos)} className="text-xs text-danger hover:text-red-400">삭제</button>
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
                        className={`border-b ${pi === rowCount - 1 ? 'border-card-border' : 'border-card-border/30'}
                          ${gi % 2 !== 0 ? 'bg-card-border/5' : ''}
                          ${isFirst ? 'border-t border-accent/20' : ''}`}
                      >
                        {isFirst && (
                          <>
                            <td className="px-1.5 py-3 max-w-[40px] overflow-hidden align-middle" rowSpan={rowCount}>{renderFlow(first)}</td>
                            <td className={mergedCellClass('left')} rowSpan={rowCount}>{renderTrader(first)}</td>
                            <td className={mergedCellClass('left')} rowSpan={rowCount}>{renderAccount(first)}</td>
                          </>
                        )}

                        {/* 거래소 (읽기전용) */}
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
                        {/* 예치금 (읽기전용) */}
                        <td className={tdClass('right')}>{formatUSDTInt(pos.deposit_usd)}</td>

                        {/* 편집 가능 셀 */}
                        {renderEditableCells(pos)}

                        {/* 공유 컬럼 */}
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
                                onChange={(e) => {
                                  group.positions.forEach((p) => handleStatusChange(p, e.target.value))
                                }}
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
                            <td className={mergedCellClass('left')} rowSpan={rowCount}>
                              <button
                                onClick={() => handleDeleteGroup(group)}
                                className="text-xs text-danger hover:text-red-400"
                              >
                                삭제
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 추가 모달 */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="포지션 추가">
        <DynamicForm
          fields={fields}
          onSubmit={handleSubmit}
          submitLabel="등록"
          isLoading={insertPosition.isPending}
        />
      </Modal>
    </DashboardLayout>
  )
}

const tdClass = (align: string) =>
  `px-3 py-2 text-sm whitespace-nowrap ${align === 'right' ? 'text-right font-mono' : 'text-left'}`
