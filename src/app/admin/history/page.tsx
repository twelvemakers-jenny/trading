'use client'

import { useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { FlowBadge } from '@/components/ui/flow-badge'
import { usePositions, useTraders, useAccounts } from '@/lib/hooks/use-data'
import { formatUSDT, formatUSDTInt, formatDollar } from '@/lib/calculations'
import { PnLChart } from '@/components/dashboard/pnl-chart'
import { groupPositions } from '@/lib/position-groups'
import type { Position, Trader, Account } from '@/types/database'

export default function HistoryPage() {
  const { data: positions = [], isLoading } = usePositions(undefined, 'closed')
  const { data: traders = [] } = useTraders()
  const { data: accounts = [] } = useAccounts()

  const positionGroups = useMemo(() => groupPositions(positions), [positions])

  // ── 헬퍼 ──
  const renderFlow = (pos: Position) => {
    const meta = pos.metadata as Record<string, string> | undefined
    return meta?.flow_type
      ? <FlowBadge flow={meta.flow_type} size="sm" />
      : <span className="text-xs text-muted">-</span>
  }

  const renderTrader = (pos: Position) =>
    traders.find((t: Trader) => t.id === pos.trader_id)?.name ?? '-'

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

  const headers = [
    { label: '흐름', align: 'left' },
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
  ]

  const thClass = (align: string) =>
    `px-3 py-3 text-xs font-medium text-muted uppercase tracking-wider whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`

  const tdClass = (align: string) =>
    `px-3 py-2 text-sm whitespace-nowrap ${align === 'right' ? 'text-right font-mono' : 'text-left'}`

  const mergedCellClass = (align: string) =>
    `px-3 py-2 text-sm align-middle ${align === 'right' ? 'text-right font-mono' : 'text-left'}`

  /** 독립 컬럼 렌더 (읽기전용) */
  const renderIndependentCells = (pos: Position) => {
    const meta = pos.metadata as Record<string, string> | undefined
    return (
      <>
        <td className={tdClass('right')}>{meta?.reward ? formatUSDTInt(meta.reward) : '-'}</td>
        <td className={tdClass('left')}>{pos.entry_date ?? '-'}</td>
        <td className={tdClass('left')}><StatusBadge status={pos.direction} /></td>
        <td className={tdClass('left')}>{pos.leverage}</td>
        <td className={tdClass('right')}>{formatDollar(meta?.tp)}</td>
        <td className={tdClass('right')}>{formatDollar(meta?.sl)}</td>
        <td className={tdClass('left')}>{pos.exit_date ?? '-'}</td>
        <td className={tdClass('right')}>{pos.closing_balance_usd ? formatUSDTInt(pos.closing_balance_usd) : '-'}</td>
      </>
    )
  }

  return (
    <DashboardLayout>
      <PageHeader title="히스토리" description="종료된 포지션 아카이브" />

      <div className="mb-6">
        <PnLChart positions={positions} />
      </div>

      {isLoading ? (
        <div className="glass-card p-8 text-center text-muted text-sm">데이터 로딩 중...</div>
      ) : positionGroups.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted text-sm">종료된 포지션이 없습니다.</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-card-border">
                  {headers.map((h, i) => (
                    <th key={i} className={thClass(h.align)}>{h.label}</th>
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
                        <td className={tdClass('left')}>{renderFlow(pos)}</td>
                        <td className={tdClass('left')}>{renderTrader(pos)}</td>
                        <td className={tdClass('left')}>{renderAccount(pos)}</td>
                        <td className={tdClass('left')}>{renderExchange(pos)}</td>
                        <td className={tdClass('right')}>{formatUSDTInt(pos.deposit_usd)}</td>
                        {renderIndependentCells(pos)}
                        <td className={tdClass('right')}>{renderPnl(group.combinedPnl)}</td>
                        <td className={tdClass('right')}>{renderRoi(group.combinedRoi)}</td>
                      </tr>
                    )
                  }

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
                            <td className={mergedCellClass('left')} rowSpan={rowCount}>{renderFlow(first)}</td>
                            <td className={mergedCellClass('left')} rowSpan={rowCount}>{renderTrader(first)}</td>
                            <td className={mergedCellClass('left')} rowSpan={rowCount}>{renderAccount(first)}</td>
                          </>
                        )}
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
                        <td className={tdClass('right')}>{formatUSDTInt(pos.deposit_usd)}</td>
                        {renderIndependentCells(pos)}
                        {isFirst && (
                          <>
                            <td className={mergedCellClass('right')} rowSpan={rowCount}>{renderPnl(group.combinedPnl)}</td>
                            <td className={mergedCellClass('right')} rowSpan={rowCount}>{renderRoi(group.combinedRoi)}</td>
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
    </DashboardLayout>
  )
}
