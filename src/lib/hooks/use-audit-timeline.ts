'use client'

import { useMemo, useState } from 'react'
import { useAllocations, useTransfers, usePositions, useTraders, useAccounts } from './use-data'

// ── 통합 감사 이벤트 타입 ──
export type AuditEventType = 'allocation' | 'transfer' | 'position_open' | 'position_close'

export interface AuditEvent {
  id: string
  type: AuditEventType
  date: string
  traderId: string
  traderName: string
  exchange: string
  amount: number
  pnl: number | null
  status: string
  memo: string
  flowType: string
}

export interface AuditFilters {
  traderId: string
  exchange: string
  type: AuditEventType | ''
  dateFrom: string
  dateTo: string
  amountMin: string
  amountMax: string
  search: string
}

const EMPTY_FILTERS: AuditFilters = {
  traderId: '',
  exchange: '',
  type: '',
  dateFrom: '',
  dateTo: '',
  amountMin: '',
  amountMax: '',
  search: '',
}

export function useAuditTimeline() {
  const { data: allocations = [], isLoading: aLoading } = useAllocations()
  const { data: transfers = [], isLoading: tLoading } = useTransfers()
  const { data: openPositions = [], isLoading: pLoading } = usePositions(undefined, 'active')
  const { data: closedPositions = [], isLoading: cLoading } = usePositions(undefined, 'closed')
  const { data: traders = [] } = useTraders()
  const { data: accounts = [] } = useAccounts()

  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const traderMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of traders) m.set(t.id, t.name)
    return m
  }, [traders])

  const getExchange = (pos: { account_id: string; metadata: Record<string, unknown> }) => {
    const meta = pos.metadata as Record<string, string> | undefined
    if (meta?.exchange) return meta.exchange
    const acc = accounts.find((a) => a.id === pos.account_id)
    return acc?.exchange ?? '-'
  }

  // ── 통합 타임라인 생성 ──
  const allEvents = useMemo(() => {
    const events: AuditEvent[] = []

    // Allocations → 이벤트
    for (const a of allocations) {
      const meta = a.metadata as Record<string, string> | undefined
      events.push({
        id: `alloc-${a.id}`,
        type: 'allocation',
        date: a.created_at,
        traderId: a.trader_id,
        traderName: traderMap.get(a.trader_id) ?? '-',
        exchange: '-',
        amount: parseFloat(a.amount_usd),
        pnl: null,
        status: a.status,
        memo: a.memo ?? '',
        flowType: meta?.flow_type ?? '',
      })
    }

    // Transfers → 이벤트
    for (const t of transfers) {
      const meta = t.metadata as Record<string, string> | undefined
      const exchangeA = meta?.exchange_a ?? ''
      const exchangeB = meta?.exchange_b ?? ''
      const exchange = [exchangeA, exchangeB].filter(Boolean).join(' / ') || '-'
      events.push({
        id: `transfer-${t.id}`,
        type: 'transfer',
        date: t.transfer_date ?? t.created_at,
        traderId: t.trader_id,
        traderName: traderMap.get(t.trader_id) ?? '-',
        exchange,
        amount: parseFloat(t.amount_usd),
        pnl: null,
        status: t.status,
        memo: t.memo ?? '',
        flowType: meta?.flow_type ?? '',
      })
    }

    // Active Positions → 포지션 진입
    for (const p of openPositions) {
      events.push({
        id: `pos-open-${p.id}`,
        type: 'position_open',
        date: p.entry_date ?? p.created_at,
        traderId: p.trader_id,
        traderName: traderMap.get(p.trader_id) ?? '-',
        exchange: getExchange(p),
        amount: parseFloat(p.deposit_usd),
        pnl: null,
        status: 'active',
        memo: p.issue_note ?? '',
        flowType: '',
      })
    }

    // Closed Positions → 포지션 종료
    for (const p of closedPositions) {
      const deposit = parseFloat(p.deposit_usd || '0')
      const closing = parseFloat(p.closing_balance_usd || '0')
      events.push({
        id: `pos-close-${p.id}`,
        type: 'position_close',
        date: p.exit_date ?? p.updated_at ?? p.created_at,
        traderId: p.trader_id,
        traderName: traderMap.get(p.trader_id) ?? '-',
        exchange: getExchange(p),
        amount: deposit,
        pnl: closing - deposit,
        status: 'closed',
        memo: p.issue_note ?? '',
        flowType: '',
      })
    }

    // 날짜순 정렬 (최신 먼저)
    return events.sort((a, b) => {
      const da = new Date(a.date).getTime() || 0
      const db = new Date(b.date).getTime() || 0
      return db - da
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocations, transfers, openPositions, closedPositions, traders, accounts])

  // ── 필터 적용 ──
  const filtered = useMemo(() => {
    return allEvents.filter((e) => {
      if (filters.traderId && e.traderId !== filters.traderId) return false
      if (filters.exchange && !e.exchange.includes(filters.exchange)) return false
      if (filters.type && e.type !== filters.type) return false

      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom).getTime()
        const d = new Date(e.date).getTime()
        if (d < from) return false
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo).getTime() + 86400000
        const d = new Date(e.date).getTime()
        if (d > to) return false
      }

      if (filters.amountMin) {
        if (e.amount < parseFloat(filters.amountMin)) return false
      }
      if (filters.amountMax) {
        if (e.amount > parseFloat(filters.amountMax)) return false
      }

      if (filters.search) {
        const q = filters.search.toLowerCase()
        const searchable = `${e.traderName} ${e.exchange} ${e.memo} ${e.flowType}`.toLowerCase()
        if (!searchable.includes(q)) return false
      }

      return true
    })
  }, [allEvents, filters])

  // ── 요약 통계 ──
  const summary = useMemo(() => {
    let totalAmount = 0
    let totalPnl = 0
    let pnlCount = 0
    for (const e of filtered) {
      totalAmount += e.amount
      if (e.pnl !== null) {
        totalPnl += e.pnl
        pnlCount++
      }
    }
    return { count: filtered.length, totalAmount, totalPnl, pnlCount }
  }, [filtered])

  // ── 페이지네이션 ──
  const paged = useMemo(() => {
    const start = page * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  // ── 거래소 목록 (필터 드롭다운용) ──
  const exchangeList = useMemo(() => {
    const set = new Set<string>()
    for (const e of allEvents) {
      if (e.exchange !== '-') {
        // "Bitget / MEXC" 같은 복합 거래소도 개별로 분리
        for (const ex of e.exchange.split(' / ')) {
          set.add(ex.trim())
        }
      }
    }
    return Array.from(set).sort()
  }, [allEvents])

  const isLoading = aLoading || tLoading || pLoading || cLoading

  return {
    events: paged,
    allEvents: filtered,
    summary,
    filters,
    setFilters,
    resetFilters: () => { setFilters(EMPTY_FILTERS); setPage(0) },
    page,
    setPage,
    totalPages,
    PAGE_SIZE,
    traders,
    exchangeList,
    isLoading,
  }
}
