'use client'

import { useMemo } from 'react'
import Decimal from 'decimal.js'
import { usePositions } from './use-data'

export interface TraderPnLData {
  traderId: string
  totalDeposit: string   // 총 투입 원금
  totalClosing: string   // 총 종료자금
  pnl: string            // 실현 P&L (종료자금 - 원금)
  roi: string            // ROI %
  closedCount: number    // 종료 포지션 수
}

/**
 * 종료된 포지션 기반 트레이더별 실현 P&L 계산
 * 히스토리에 기록된 확정 결과만 반영
 */
export function useTraderPnL() {
  const { data: closedPositions = [] } = usePositions(undefined, 'closed')

  const traderPnLMap = useMemo(() => {
    const map = new Map<string, {
      totalDeposit: Decimal
      totalClosing: Decimal
      closedCount: number
    }>()

    for (const pos of closedPositions) {
      const existing = map.get(pos.trader_id) ?? {
        totalDeposit: new Decimal(0),
        totalClosing: new Decimal(0),
        closedCount: 0,
      }

      existing.totalDeposit = existing.totalDeposit.plus(new Decimal(pos.deposit_usd || '0'))
      existing.totalClosing = existing.totalClosing.plus(new Decimal(pos.closing_balance_usd || '0'))
      existing.closedCount += 1

      map.set(pos.trader_id, existing)
    }

    const result = new Map<string, TraderPnLData>()

    for (const [traderId, data] of map) {
      const pnl = data.totalClosing.minus(data.totalDeposit)
      const roi = data.totalDeposit.isZero()
        ? '0.00'
        : pnl.dividedBy(data.totalDeposit).times(100).toDecimalPlaces(1).toFixed(1)

      result.set(traderId, {
        traderId,
        totalDeposit: data.totalDeposit.toFixed(1),
        totalClosing: data.totalClosing.toFixed(1),
        pnl: pnl.toFixed(1),
        roi,
        closedCount: data.closedCount,
      })
    }

    return result
  }, [closedPositions])

  // 전체 합산
  const totalPnL = useMemo(() => {
    let total = new Decimal(0)
    for (const [, data] of traderPnLMap) {
      total = total.plus(new Decimal(data.pnl))
    }
    return total.toFixed(1)
  }, [traderPnLMap])

  return { traderPnLMap, totalPnL, closedPositions }
}
