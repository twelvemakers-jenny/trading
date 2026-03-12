'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Area, AreaChart,
} from 'recharts'
import { useTraders, usePositions, useAllocations, useAccounts, useTransfers, useExchanges } from '@/lib/hooks/use-data'
import { useTraderPnL } from '@/lib/hooks/use-trader-pnl'
import { useFundSummary } from '@/lib/hooks/use-fund-summary'
import { formatUSD } from '@/lib/calculations'

const COLORS = ['#818cf8', '#a78bfa', '#60a5fa', '#c084fc', '#34d399', '#f472b6', '#22d3ee', '#fb923c', '#6366f1', '#e879f9']
const GREEN = '#34d399'  // emerald-400
const RED = '#fb7185'    // rose-400

function fmt(v: number) {
  return `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtSigned(v: number) {
  const prefix = v >= 0 ? '+' : '-'
  return `${prefix}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

type PnlPeriod = 'day' | 'week' | 'month'
const PERIOD_LABELS: Record<PnlPeriod, string> = { day: '일간', week: '주간', month: '월간' }

export function AdminDashboard() {
  const { data: traders = [] } = useTraders()
  const { data: activePositions = [] } = usePositions(undefined, 'active')
  const { data: allocations = [] } = useAllocations()
  const { data: accounts = [] } = useAccounts()
  const { data: transfers = [] } = useTransfers()
  const { traderPnLMap, totalPnL, closedPositions } = useTraderPnL()
  const { exchangeColors } = useExchanges()

  const [pnlPeriod, setPnlPeriod] = useState<PnlPeriod>('month')

  const getExchange = (pos: { account_id: string; metadata: Record<string, unknown> }) => {
    const meta = pos.metadata as Record<string, string> | undefined
    if (meta?.exchange) return meta.exchange
    const acc = accounts.find((a) => a.id === pos.account_id)
    return acc?.exchange ?? '기타'
  }

  // ── 핵심 지표 (공유 훅 기반) ──
  const fundSummary = useFundSummary(allocations, traders, traderPnLMap)

  const metrics = useMemo(() => {
    const pnl = parseFloat(totalPnL)
    const totalAssets = fundSummary.totalAUM + pnl
    const totalOperating = activePositions.reduce(
      (sum, p) => sum + parseFloat(p.deposit_usd || '0'), 0
    )

    // traderFundMap: traderList에서 추출 (기존 호환)
    const traderFundMap = new Map<string, number>()
    for (const t of fundSummary.traderList) {
      traderFundMap.set(t.id, t.fund)
    }

    return {
      totalAssets,
      totalAUM: fundSummary.totalAUM,
      headFund: fundSummary.headFund,
      totalAllocated: fundSummary.totalTraderFunds,
      totalAdjusted: fundSummary.totalAdjusted,
      totalOperating,
      totalPnL: pnl,
      activeCount: activePositions.length,
      closedCount: closedPositions.length,
      traderCount: traders.filter((t) => t.role !== 'admin').length,
      traderFundMap,
    }
  }, [fundSummary, totalPnL, activePositions, closedPositions, traders])

  // ── 트레이더별 운용 현황 (공유 훅 기반) ──
  const traderStats = useMemo(() => {
    return fundSummary.traderList.map((ft) => {
      const operatingFund = activePositions
        .filter((p) => p.trader_id === ft.id)
        .reduce((sum, p) => sum + parseFloat(p.deposit_usd || '0'), 0)
      const pnlData = traderPnLMap.get(ft.id)
      const roi = pnlData ? parseFloat(pnlData.roi) : 0
      const activeCount = activePositions.filter((p) => p.trader_id === ft.id).length
      const closedCount = pnlData?.closedCount ?? 0
      return {
        id: ft.id, name: ft.name, email: ft.email, role: ft.role,
        allocatedFund: ft.adjustedFund, baseFund: ft.fund, operatingFund,
        pnl: ft.pnl, roi, activeCount, closedCount,
      }
    })
  }, [fundSummary.traderList, traderPnLMap, activePositions])

  // ── 거래소별 운용 비중 ──
  const exchangeActiveData = useMemo(() => {
    const map = new Map<string, number>()
    for (const pos of activePositions) {
      const exchange = getExchange(pos)
      const deposit = parseFloat(pos.deposit_usd || '0')
      map.set(exchange, (map.get(exchange) ?? 0) + deposit)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value), color: exchangeColors[name] ?? COLORS[0] }))
      .sort((a, b) => b.value - a.value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePositions, accounts, exchangeColors])

  // ── 거래소별 수익/손실 ──
  const exchangePnlStats = useMemo(() => {
    const now = new Date()
    let cutoff: Date
    if (pnlPeriod === 'day') cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    else if (pnlPeriod === 'week') { cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 7) }
    else cutoff = new Date(now.getFullYear(), now.getMonth(), 1)

    const filtered = closedPositions.filter((p) => p.exit_date && new Date(p.exit_date) >= cutoff)
    const map = new Map<string, { deposit: number; pnl: number; count: number }>()
    for (const pos of filtered) {
      const exchange = getExchange(pos)
      const prev = map.get(exchange) ?? { deposit: 0, pnl: 0, count: 0 }
      const deposit = parseFloat(pos.deposit_usd || '0')
      const closing = parseFloat(pos.closing_balance_usd || '0')
      map.set(exchange, { deposit: prev.deposit + deposit, pnl: prev.pnl + (closing - deposit), count: prev.count + 1 })
    }
    return Array.from(map.entries())
      .map(([exchange, data]) => ({ exchange, ...data }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closedPositions, pnlPeriod, accounts])

  const maxAbsPnl = useMemo(() => {
    if (exchangePnlStats.length === 0) return 1
    return Math.max(...exchangePnlStats.map((e) => Math.abs(e.pnl)), 1)
  }, [exchangePnlStats])

  // ── 월별 P&L ──
  const monthlyData = useMemo(() => {
    const monthly: Record<string, { pnl: number; deposit: number }> = {}
    for (const p of closedPositions) {
      if (!p.exit_date) continue
      const month = String(p.exit_date).slice(0, 7)
      const deposit = parseFloat(p.deposit_usd || '0')
      const closing = parseFloat(p.closing_balance_usd || '0')
      const pnl = closing - deposit
      const prev = monthly[month] ?? { pnl: 0, deposit: 0 }
      monthly[month] = { pnl: prev.pnl + pnl, deposit: prev.deposit + deposit }
    }
    let cumPnl = 0
    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { pnl, deposit }]) => {
        cumPnl += pnl
        return { month, pnl: Math.round(pnl), roi: deposit > 0 ? Math.round((pnl / deposit) * 10000) / 100 : 0, cumPnl: Math.round(cumPnl) }
      })
  }, [closedPositions])

  // ── 자산 구성 ──
  const assetPieData = useMemo(() => {
    const result = []
    if (metrics.totalOperating > 0) result.push({ name: '운용 펀드', value: Math.round(metrics.totalOperating) })
    const idle = metrics.totalAUM - metrics.totalOperating
    if (idle > 0) result.push({ name: '비운용', value: Math.round(idle) })
    if (metrics.totalPnL !== 0) result.push({ name: metrics.totalPnL >= 0 ? '실현수익' : '실현손실', value: Math.abs(Math.round(metrics.totalPnL)) })
    return result
  }, [metrics])

  // ── 이체 트렌드 ──
  const transferTrend = useMemo(() => {
    const monthly: Record<string, { inflow: number; outflow: number }> = {}
    for (const t of transfers) {
      if (t.status === 'cancelled') continue
      const month = String(t.transfer_date).slice(0, 7)
      const amount = parseFloat(t.amount_usd || '0')
      const prev = monthly[month] ?? { inflow: 0, outflow: 0 }
      if (t.purpose === 'initial' || t.purpose === 'additional') monthly[month] = { ...prev, inflow: prev.inflow + amount }
      else monthly[month] = { ...prev, outflow: prev.outflow + amount }
    }
    return Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({ month, ...data }))
  }, [transfers])

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: 'rgba(10, 8, 24, 0.9)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      color: '#e2e8f0',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    },
  }

  return (
    <div className="space-y-3">
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between mb-2 bento-animate">
        <div>
          <h2 className="text-xl font-bold text-foreground">전체 현황판</h2>
          <p className="text-xs text-muted mt-0.5">Delta-Neutral Trading Overview</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.15em] text-emerald-400 font-medium">LIVE</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BENTO GRID: 12-column system
         ══════════════════════════════════════════ */}
      <div className="grid grid-cols-12 gap-3">

        {/* ── R1: 6개 핵심 지표 카드 ── */}
        <BentoCard className="col-span-6 md:col-span-4 lg:col-span-2" label="Total AUM" index={0}>
          <p className="text-2xl font-bold font-mono text-foreground">{fmt(metrics.totalAssets)}</p>
          <p className="text-[10px] text-muted mt-1">펀드자산 + P&L</p>
        </BentoCard>

        <BentoCard className="col-span-6 md:col-span-4 lg:col-span-2" label="회사 수령 자금" index={1}>
          <p className="text-2xl font-bold font-mono text-foreground">{fmt(metrics.totalAUM)}</p>
          <p className="text-[10px] text-muted mt-1">전체 운용자산</p>
        </BentoCard>

        <BentoCard className="col-span-6 md:col-span-4 lg:col-span-2" label="Head Fund" index={2}>
          <p className="text-xl font-bold font-mono text-blue-400">{fmt(metrics.headFund)}</p>
          <p className="text-[10px] text-muted mt-1">미분배 자금</p>
        </BentoCard>

        <BentoCard className="col-span-6 md:col-span-4 lg:col-span-2" label="트레이더 분배" index={3}>
          <p className="text-xl font-bold font-mono text-indigo-300">{fmt(metrics.totalAllocated)}</p>
          <p className="text-[10px] text-muted mt-1">
            {metrics.traderCount}명 / P&L반영 {fmt(metrics.totalAdjusted)}
          </p>
        </BentoCard>

        <BentoCard className="col-span-6 md:col-span-4 lg:col-span-2" label="운용 펀드" index={4}>
          <p className="text-xl font-bold font-mono text-purple-300">{fmt(metrics.totalOperating)}</p>
          <p className="text-[10px] text-muted mt-1">{metrics.activeCount}건 진행</p>
        </BentoCard>

        <BentoCard className="col-span-6 md:col-span-4 lg:col-span-2" label="누적 P&L" index={5}>
          <p className={`text-xl font-bold font-mono ${metrics.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmtSigned(metrics.totalPnL)}
          </p>
          <p className="text-[10px] text-muted mt-1">
            {metrics.totalOperating > 0 ? `ROI ${(metrics.totalPnL / metrics.totalOperating * 100).toFixed(1)}%` : '-'}
          </p>
        </BentoCard>

        {/* ── R2: 자산 구성 (4col) + 트레이더 운용 현황 (8col) ── */}
        <BentoCard className="col-span-12 md:col-span-4" label="자산 구성" index={5}>
          {assetPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={assetPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {assetPieData.map((_, i) => (
                    <Cell key={i} fill={[GREEN, '#818cf8', metrics.totalPnL >= 0 ? '#a78bfa' : RED][i] ?? COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
                <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted text-sm">데이터 없음</div>
          )}
        </BentoCard>

        <BentoCard className="col-span-12 md:col-span-8" label="트레이더 운용 현황" index={6}>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {['트레이더', '역할', '할당 펀드', '운용 펀드', 'P&L', 'ROI', '활성', '완료'].map((h) => (
                    <th key={h} className="px-3 py-2 text-[10px] font-medium text-muted text-left whitespace-nowrap uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {traderStats.map((t) => (
                  <tr key={t.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-2.5">
                      <span className="text-sm font-medium">{t.name}</span>
                      {t.email && <span className="block text-[10px] text-muted">{t.email}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted capitalize">{t.role === 'head_trader' ? 'Head' : 'Trader'}</td>
                    <td className="px-3 py-2.5 text-sm font-mono">{formatUSD(String(t.allocatedFund.toFixed(1)))}</td>
                    <td className="px-3 py-2.5 text-sm font-mono text-accent">{formatUSD(String(t.operatingFund.toFixed(1)))}</td>
                    <td className={`px-3 py-2.5 text-sm font-mono ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.pnl === 0 ? <span className="text-muted">-</span> : fmtSigned(t.pnl)}
                    </td>
                    <td className={`px-3 py-2.5 text-sm font-mono ${t.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.pnl === 0 ? <span className="text-muted">-</span> : `${t.roi >= 0 ? '+' : ''}${t.roi.toFixed(1)}%`}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-accent">{t.activeCount}건</td>
                    <td className="px-3 py-2.5 text-sm text-muted">{t.closedCount}건</td>
                  </tr>
                ))}
                {traderStats.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-muted text-sm">트레이더 없음</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </BentoCard>

        {/* ── R3: 거래소 운용 비중 (4col) + 거래소별 수익/손실 (8col) ── */}
        <BentoCard className="col-span-12 md:col-span-4" label="거래소별 운용 비중" sub="진행 중인 포지션 기준" index={7}>
          {exchangeActiveData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={exchangeActiveData} cx="50%" cy="50%" outerRadius={80} paddingAngle={2} dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {exchangeActiveData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted text-sm">진행 중인 포지션 없음</div>
          )}
        </BentoCard>

        <div
          className="col-span-12 md:col-span-8 glass-bento p-5 flex flex-col bento-animate"
          style={{ animationDelay: `${8 * 0.06}s` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted font-medium">거래소별 수익/손실</h3>
            </div>
            <div className="flex rounded-xl overflow-hidden border border-white/[0.05]">
              {(['day', 'week', 'month'] as PnlPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPnlPeriod(p)}
                  className={`px-3 py-1 text-[11px] font-medium transition-all
                    ${pnlPeriod === p
                      ? 'bg-indigo-500/20 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.15)]'
                      : 'text-muted hover:text-foreground hover:bg-white/[0.04]'}`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto max-h-[320px] -mx-1 px-1 space-y-2 flex-1">
            {exchangePnlStats.length > 0 ? (
              exchangePnlStats.map((e) => {
                const roi = e.deposit > 0 ? (e.pnl / e.deposit * 100) : 0
                const barWidth = Math.abs(e.pnl) / maxAbsPnl * 100
                const dotColor = exchangeColors[e.exchange] ?? '#6b7280'
                return (
                  <div key={e.exchange} className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                        <span className="text-sm font-medium">{e.exchange}</span>
                        <span className="text-[10px] text-muted">{e.count}건</span>
                      </div>
                      <span className={`text-sm font-mono font-semibold ${e.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {fmtSigned(Math.round(e.pnl))}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden mb-1">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${barWidth}%`, backgroundColor: e.pnl >= 0 ? GREEN : RED }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted">
                      <span>투입금 ${e.deposit.toLocaleString()}</span>
                      <span className={roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}>ROI {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%</span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex items-center justify-center h-32 text-muted text-sm">{PERIOD_LABELS[pnlPeriod]} 종료된 포지션 없음</div>
            )}
          </div>

          {exchangePnlStats.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between text-xs">
              <span className="text-muted">{exchangePnlStats.length}개 거래소</span>
              <span className={`font-mono font-semibold ${exchangePnlStats.reduce((s, e) => s + e.pnl, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                합계 {fmtSigned(Math.round(exchangePnlStats.reduce((s, e) => s + e.pnl, 0)))}
              </span>
            </div>
          )}
        </div>

        {/* ── R4: 누적 P&L 추이 (6col) + 월별 ROI (6col) ── */}
        <BentoCard className="col-span-12 md:col-span-6" label="누적 P&L 추이" index={7}>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gradPnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.06)" />
                <XAxis dataKey="month" tick={{ fill: '#6b7294', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7294', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip {...tooltipStyle} formatter={(value) => [`$${Number(value).toLocaleString()}`, '누적 P&L']} />
                <Area type="monotone" dataKey="cumPnl" stroke="#a78bfa" strokeWidth={2} fill="url(#gradPnl)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted text-sm">데이터 없음</div>
          )}
        </BentoCard>

        <BentoCard className="col-span-12 md:col-span-6" label="월별 ROI (%)" index={8}>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.06)" />
                <XAxis dataKey="month" tick={{ fill: '#6b7294', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7294', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip {...tooltipStyle} formatter={(value) => [`${Number(value).toFixed(1)}%`, 'ROI']} />
                <Line type="monotone" dataKey="roi" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted text-sm">데이터 없음</div>
          )}
        </BentoCard>

        {/* ── R4: 월별 P&L (8col) + 트레이더별 P&L (4col) ── */}
        <BentoCard className="col-span-12 lg:col-span-8" label="월별 P&L" index={9}>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.06)" />
                <XAxis dataKey="month" tick={{ fill: '#6b7294', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7294', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip {...tooltipStyle} formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name === 'pnl' ? '월간 P&L' : '누적 P&L']} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]} name="pnl">
                  {monthlyData.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? GREEN : RED} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted text-sm">종료된 포지션이 없습니다</div>
          )}
        </BentoCard>

        <BentoCard className="col-span-12 lg:col-span-4" label="트레이더별 P&L" index={10}>
          {traderStats.filter((t) => t.pnl !== 0).length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(220, traderStats.filter((t) => t.pnl !== 0).length * 40)}>
              <BarChart data={traderStats.filter((t) => t.pnl !== 0)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.06)" />
                <XAxis type="number" tick={{ fill: '#6b7294', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#e2e8f0', fontSize: 12 }} width={60} />
                <Tooltip {...tooltipStyle} formatter={(value) => [`$${Number(value).toLocaleString()}`, 'P&L']} />
                <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                  {traderStats.filter((t) => t.pnl !== 0).map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? GREEN : RED} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted text-sm">P&L 데이터 없음</div>
          )}
        </BentoCard>

        {/* ── R7: 이체 트렌드 (12col) ── */}
        {transferTrend.length > 0 && (
          <BentoCard className="col-span-12" label="월별 자금 흐름 (이체)" index={13}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={transferTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.06)" />
                <XAxis dataKey="month" tick={{ fill: '#6b7294', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7294', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip {...tooltipStyle} formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name === 'inflow' ? '유입' : '유출']} />
                <Legend formatter={(value) => <span className="text-xs text-foreground">{value === 'inflow' ? '유입' : '유출'}</span>} />
                <Bar dataKey="inflow" fill="#818cf8" radius={[4, 4, 0, 0]} name="inflow" />
                <Bar dataKey="outflow" fill="#f59e0b" radius={[4, 4, 0, 0]} name="outflow" />
              </BarChart>
            </ResponsiveContainer>
          </BentoCard>
        )}

      </div>
    </div>
  )
}

// ── 벤토 카드 컴포넌트 (CSS 애니메이션 — 한 번만 재생) ──
function BentoCard({
  className,
  label,
  sub,
  children,
  index = 0,
}: {
  className?: string
  label: string
  sub?: string
  children: React.ReactNode
  index?: number
}) {
  return (
    <div
      className={`glass-bento p-5 bento-animate ${className ?? ''}`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="mb-3">
        <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted font-medium">{label}</h3>
        {sub && <p className="text-[9px] text-muted/60 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}
