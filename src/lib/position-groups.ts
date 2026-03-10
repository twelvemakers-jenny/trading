import Decimal from 'decimal.js'
import type { Position } from '@/types/database'

export interface PositionGroup {
  type: 'single' | 'pair'
  positions: Position[]
  combinedPnl: string | null
  combinedRoi: string | null
}

export function groupPositions(positions: Position[]): PositionGroup[] {
  const transferMap = new Map<string, Position[]>()
  const standalone: Position[] = []

  for (const pos of positions) {
    const meta = pos.metadata as Record<string, string> | undefined
    const transferId = meta?.source_transfer_id
    if (transferId) {
      const existing = transferMap.get(transferId) ?? []
      transferMap.set(transferId, [...existing, pos])
    } else {
      standalone.push(pos)
    }
  }

  const groups: PositionGroup[] = []

  for (const [, paired] of transferMap) {
    const sorted = [...paired].sort((a, b) => {
      const metaA = a.metadata as Record<string, string> | undefined
      const metaB = b.metadata as Record<string, string> | undefined
      return (metaA?.pair ?? '').localeCompare(metaB?.pair ?? '')
    })

    const totalDeposit = sorted.reduce(
      (acc, p) => acc.plus(new Decimal(p.deposit_usd || '0')), new Decimal(0)
    )
    const allHaveClosing = sorted.every((p) => p.closing_balance_usd)
    let combinedPnl: string | null = null
    let combinedRoi: string | null = null

    if (allHaveClosing) {
      const totalClosing = sorted.reduce(
        (acc, p) => acc.plus(new Decimal(p.closing_balance_usd || '0')), new Decimal(0)
      )
      const pnl = totalClosing.minus(totalDeposit)
      combinedPnl = pnl.toFixed(1)
      combinedRoi = totalDeposit.isZero()
        ? '0.00'
        : pnl.dividedBy(totalDeposit).times(100).toDecimalPlaces(1).toFixed(1)
    }

    groups.push({
      type: sorted.length >= 2 ? 'pair' : 'single',
      positions: sorted,
      combinedPnl,
      combinedRoi,
    })
  }

  for (const pos of standalone) {
    groups.push({
      type: 'single',
      positions: [pos],
      combinedPnl: pos.pnl_usd ?? null,
      combinedRoi: pos.roi_percent ?? null,
    })
  }

  return groups
}
