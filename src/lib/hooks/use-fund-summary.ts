'use client'

import { useMemo } from 'react'
import type { Allocation, Trader } from '@/types/database'
import type { TraderPnLData } from './use-trader-pnl'

export interface TraderFundItem {
  id: string
  name: string
  email: string
  role: string
  fund: number
  pnl: number
  roi: string
  adjustedFund: number
}

export interface FundSummary {
  totalAUM: number
  headFund: number
  traderList: TraderFundItem[]
  totalTraderFunds: number
  totalAdjusted: number
}

/**
 * 할당(allocations) 기반 자금 흐름 요약 계산
 * 펀드운용 + 이체원장 양쪽에서 공유
 */
export function useFundSummary(
  allocations: Allocation[],
  traders: Trader[],
  traderPnLMap: Map<string, TraderPnLData>,
): FundSummary {
  return useMemo(() => {
    const active = allocations.filter((a) => a.status === 'active')

    let totalAUM = 0
    let headFund = 0
    const traderFunds = new Map<string, { name: string; email: string; role: string; fund: number }>()

    for (const alloc of active) {
      const meta = alloc.metadata as Record<string, string> | undefined
      const flow = meta?.flow_type ?? ''
      const amount = parseFloat(alloc.amount_usd)
      const trader = traders.find((t) => t.id === alloc.trader_id)
      const traderEmail = (trader?.metadata as Record<string, string>)?.email ?? ''

      switch (flow) {
        case 'company_to_head':
          totalAUM += amount
          headFund += amount
          break
        case 'head_to_trader': {
          headFund -= amount
          const existing = traderFunds.get(alloc.trader_id) ?? { name: trader?.name ?? '미지정', email: traderEmail, role: trader?.role ?? 'trader', fund: 0 }
          existing.fund += amount
          traderFunds.set(alloc.trader_id, existing)
          break
        }
        case 'trader_to_exchange': {
          const ex = traderFunds.get(alloc.trader_id) ?? { name: trader?.name ?? '미지정', email: traderEmail, role: trader?.role ?? 'trader', fund: 0 }
          ex.fund -= amount
          traderFunds.set(alloc.trader_id, ex)
          break
        }
        case 'exchange_to_trader': {
          const ex2 = traderFunds.get(alloc.trader_id) ?? { name: trader?.name ?? '미지정', email: traderEmail, role: trader?.role ?? 'trader', fund: 0 }
          ex2.fund += amount
          traderFunds.set(alloc.trader_id, ex2)
          break
        }
        case 'trader_to_head': {
          const ex3 = traderFunds.get(alloc.trader_id) ?? { name: trader?.name ?? '미지정', email: traderEmail, role: trader?.role ?? 'trader', fund: 0 }
          ex3.fund -= amount
          traderFunds.set(alloc.trader_id, ex3)
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
            const fallback = traderFunds.get(alloc.trader_id) ?? { name: trader?.name ?? '미지정', email: traderEmail, role: trader?.role ?? 'trader', fund: 0 }
            fallback.fund += amount
            traderFunds.set(alloc.trader_id, fallback)
          }
          break
      }
    }

    const traderList: TraderFundItem[] = Array.from(traderFunds.entries())
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
}
