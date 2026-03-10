'use client'

import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { useAuditTimeline, type AuditEventType } from '@/lib/hooks/use-audit-timeline'
import { formatUSD } from '@/lib/calculations'
import { exportToExcel } from '@/lib/export-excel'

const TYPE_CONFIG: Record<AuditEventType, { label: string; color: string; bg: string }> = {
  allocation: { label: '배정', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  transfer: { label: '이체', color: 'text-violet-400', bg: 'bg-violet-500/15' },
  position_open: { label: '포지션 진입', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  position_close: { label: '포지션 종료', color: 'text-amber-400', bg: 'bg-amber-500/15' },
}

const FLOW_LABELS: Record<string, string> = {
  company_to_head: '회사→헤드',
  head_to_trader: '헤드→트레이더',
  trader_to_exchange: '트레이더→거래소',
  exchange_to_trader: '거래소→트레이더',
  trader_to_head: '트레이더→헤드',
  head_to_company: '헤드→회사',
}

function fmtSigned(v: number) {
  const prefix = v >= 0 ? '+' : '-'
  return `${prefix}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
}

function formatDate(d: string) {
  if (!d) return '-'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function AuditPage() {
  const {
    events,
    allEvents,
    summary,
    filters,
    setFilters,
    resetFilters,
    page,
    setPage,
    totalPages,
    PAGE_SIZE,
    traders,
    exchangeList,
    isLoading,
  } = useAuditTimeline()

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(0)
  }

  const inputClass = `px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-foreground
    focus:outline-none focus:border-accent transition-colors
    [&>option]:bg-[#1e293b] [&>option]:text-white`

  const activeTraders = traders.filter((t) => t.role !== 'admin')
  const hasFilters = Object.values(filters).some((v) => v !== '')

  const handleExport = () => {
    const typeLabels: Record<string, string> = {
      allocation: '배정', transfer: '이체',
      position_open: '포지션 진입', position_close: '포지션 종료',
    }
    const rows = allEvents.map((e) => ({
      date: formatDate(e.date),
      type: typeLabels[e.type] ?? e.type,
      flowType: e.flowType ? (FLOW_LABELS[e.flowType] ?? e.flowType) : '',
      traderName: e.traderName,
      exchange: e.exchange,
      amount: e.amount,
      pnl: e.pnl ?? '',
      status: e.status,
      memo: e.memo,
    }))
    exportToExcel(rows, [
      { header: '날짜', key: 'date' },
      { header: '유형', key: 'type' },
      { header: '흐름', key: 'flowType' },
      { header: '트레이더', key: 'traderName' },
      { header: '거래소', key: 'exchange' },
      { header: '금액', key: 'amount' },
      { header: 'P&L', key: 'pnl' },
      { header: '상태', key: 'status' },
      { header: '메모', key: 'memo' },
    ], '감사추적')
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="감사 추적"
        description="전체 거래 활동 통합 타임라인"
        actions={[{ label: '엑셀 다운로드', onClick: handleExport, variant: 'secondary', confirm: '엑셀 파일을 다운로드 하시겠습니까?' }]}
      />

      {/* ── 필터 바 ── */}
      <div className="glass-card p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* 검색 */}
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="검색 (트레이더, 거래소, 메모...)"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className={`w-full ${inputClass}`}
            />
          </div>

          {/* 트레이더 */}
          <select
            value={filters.traderId}
            onChange={(e) => updateFilter('traderId', e.target.value)}
            className={inputClass}
          >
            <option value="">전체 트레이더</option>
            {activeTraders.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* 활동 유형 */}
          <select
            value={filters.type}
            onChange={(e) => updateFilter('type', e.target.value)}
            className={inputClass}
          >
            <option value="">전체 유형</option>
            <option value="allocation">배정</option>
            <option value="transfer">이체</option>
            <option value="position_open">포지션 진입</option>
            <option value="position_close">포지션 종료</option>
          </select>

          {/* 거래소 */}
          <select
            value={filters.exchange}
            onChange={(e) => updateFilter('exchange', e.target.value)}
            className={inputClass}
          >
            <option value="">전체 거래소</option>
            {exchangeList.map((ex) => (
              <option key={ex} value={ex}>{ex}</option>
            ))}
          </select>

          {/* 기간 */}
          <input
            type="date"
            value={filters.dateFrom}
            max="9999-12-31"
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
            className={inputClass}
            title="시작일"
          />
          <input
            type="date"
            value={filters.dateTo}
            max="9999-12-31"
            onChange={(e) => updateFilter('dateTo', e.target.value)}
            className={inputClass}
            title="종료일"
          />

          {/* 초기화 */}
          <button
            onClick={resetFilters}
            disabled={!hasFilters}
            className="px-3 py-2 text-xs bg-card-border/30 text-muted rounded-lg
                       hover:bg-card-border/50 transition-colors disabled:opacity-30"
          >
            필터 초기화
          </button>
        </div>

        {/* 금액 범위 (접이식) */}
        {(filters.amountMin || filters.amountMax) ? (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-muted">금액 범위:</span>
            <input
              type="number"
              placeholder="최소"
              value={filters.amountMin}
              onChange={(e) => updateFilter('amountMin', e.target.value)}
              className={`w-28 ${inputClass}`}
            />
            <span className="text-muted">~</span>
            <input
              type="number"
              placeholder="최대"
              value={filters.amountMax}
              onChange={(e) => updateFilter('amountMax', e.target.value)}
              className={`w-28 ${inputClass}`}
            />
          </div>
        ) : (
          <button
            onClick={() => updateFilter('amountMin', '')}
            className="mt-2 text-[11px] text-muted hover:text-accent transition-colors"
          >
            + 금액 범위 필터
          </button>
        )}
      </div>

      {/* ── 요약 카드 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard label="총 건수" value={`${summary.count}건`} />
        <SummaryCard label="총 금액" value={formatUSD(String(summary.totalAmount.toFixed(1)))} />
        <SummaryCard
          label="총 실현 P&L"
          value={summary.pnlCount > 0 ? fmtSigned(summary.totalPnl) : '-'}
          color={summary.totalPnl >= 0 ? 'text-success' : 'text-danger'}
        />
        <SummaryCard label="P&L 건수" value={summary.pnlCount > 0 ? `${summary.pnlCount}건` : '-'} />
      </div>

      {/* ── 타임라인 테이블 ── */}
      {isLoading ? (
        <div className="glass-card p-8 text-center text-muted text-sm">데이터 로딩 중...</div>
      ) : events.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted text-sm">
          {hasFilters ? '필터 조건에 맞는 데이터가 없습니다.' : '데이터가 없습니다.'}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-card-border">
                  {['날짜', '유형', '흐름', '트레이더', '거래소', '금액', 'P&L', '상태', '메모'].map((h) => (
                    <th key={h} className="px-3 py-3 text-xs font-medium text-muted text-left whitespace-nowrap uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => {
                  const cfg = TYPE_CONFIG[e.type]
                  return (
                    <tr
                      key={e.id}
                      className={`border-b border-card-border/50 hover:bg-card-border/20 transition-colors
                        ${i % 2 !== 0 ? 'bg-card-border/5' : ''}`}
                    >
                      <td className="px-3 py-2.5 text-sm whitespace-nowrap">{formatDate(e.date)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted whitespace-nowrap">
                        {e.flowType ? (FLOW_LABELS[e.flowType] ?? e.flowType) : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-sm font-medium whitespace-nowrap">{e.traderName}</td>
                      <td className="px-3 py-2.5 text-sm whitespace-nowrap">{e.exchange}</td>
                      <td className="px-3 py-2.5 text-sm font-mono text-right whitespace-nowrap">
                        {formatUSD(String(e.amount.toFixed(1)))}
                      </td>
                      <td className="px-3 py-2.5 text-sm font-mono text-right whitespace-nowrap">
                        {e.pnl !== null ? (
                          <span className={e.pnl >= 0 ? 'text-success' : 'text-danger'}>
                            {fmtSigned(e.pnl)}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusDot status={e.status} />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted max-w-[200px] truncate" title={e.memo}>
                        {e.memo || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-card-border">
              <span className="text-xs text-muted">
                {page * PAGE_SIZE + 1}~{Math.min((page + 1) * PAGE_SIZE, summary.count)} / {summary.count}건
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                  className="px-2 py-1 text-xs text-muted hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  처음
                </button>
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                  className="px-2 py-1 text-xs text-muted hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  이전
                </button>
                <span className="px-3 py-1 text-xs text-foreground font-medium">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  className="px-2 py-1 text-xs text-muted hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  다음
                </button>
                <button
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page >= totalPages - 1}
                  className="px-2 py-1 text-xs text-muted hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  마지막
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="glass-card p-4">
      <p className="text-[11px] text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${color ?? 'text-foreground'}`}>{value}</p>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-400',
    completed: 'bg-emerald-400',
    closed: 'bg-gray-400',
    pending: 'bg-yellow-400',
    cancelled: 'bg-red-400',
    adjusted: 'bg-blue-400',
  }
  const labels: Record<string, string> = {
    active: '활성',
    completed: '완료',
    closed: '종료',
    pending: '대기',
    cancelled: '취소',
    adjusted: '조정',
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${colors[status] ?? 'bg-gray-400'}`} />
      <span className="text-xs text-muted">{labels[status] ?? status}</span>
    </div>
  )
}
