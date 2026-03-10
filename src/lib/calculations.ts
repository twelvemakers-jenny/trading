// P&L, ROI 정밀 계산 (decimal.js 기반)
// 부동소수점 오차 방지를 위해 모든 금융 연산은 이 모듈을 통해 수행
import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

/** P&L 계산: 종료잔액 - 예치금 */
export function calculatePnL(
  depositUsd: string,
  closingBalanceUsd: string | null
): string {
  if (!closingBalanceUsd) return '0'
  const deposit = new Decimal(depositUsd)
  const closing = new Decimal(closingBalanceUsd)
  return closing.minus(deposit).toFixed(1)
}

/** ROI 계산: (P&L / 예치금) * 100 */
export function calculateROI(
  depositUsd: string,
  closingBalanceUsd: string | null
): string {
  if (!closingBalanceUsd) return '0'
  const deposit = new Decimal(depositUsd)
  if (deposit.isZero()) return '0'
  const pnl = new Decimal(closingBalanceUsd).minus(deposit)
  return pnl.dividedBy(deposit).times(100).toDecimalPlaces(2).toFixed(1)
}

/** 합계 계산 */
export function sumAmounts(amounts: string[]): string {
  return amounts
    .reduce((acc, val) => acc.plus(new Decimal(val || '0')), new Decimal(0))
    .toFixed(1)
}

/** 잔여 할당금: 총 할당 - 이체 합계 */
export function calculateRemainingAllocation(
  totalAllocation: string,
  totalTransferred: string
): string {
  const allocation = new Decimal(totalAllocation)
  const transferred = new Decimal(totalTransferred)
  return allocation.minus(transferred).toFixed(1)
}

/** 펀드 P&L 계산: 스냅샷 기반 누적 변동 */
export function calculateFundPnL(
  snapshots: { event_type: string; amount_usd: string }[]
): string {
  return snapshots
    .filter((s) => s.event_type === 'realized_pnl')
    .reduce((acc, s) => acc.plus(new Decimal(s.amount_usd || '0')), new Decimal(0))
    .toFixed(1)
}

/** 펀드 ROI 계산: 실현P&L / 총 투입금 * 100 */
export function calculateFundROI(
  snapshots: { event_type: string; amount_usd: string }[]
): string {
  const totalIn = snapshots
    .filter((s) => ['allocation_in', 'transfer_from_exchange'].includes(s.event_type))
    .reduce((acc, s) => acc.plus(new Decimal(s.amount_usd || '0')), new Decimal(0))

  if (totalIn.isZero()) return '0.00'

  const pnl = new Decimal(calculateFundPnL(snapshots))
  return pnl.dividedBy(totalIn).times(100).toDecimalPlaces(2).toFixed(1)
}

/** 숫자를 USD 포맷으로 변환 */
export function formatUSD(value: string): string {
  const num = new Decimal(value)
  const formatted = num.toFixed(1)
  const [integer, decimal] = formatted.split('.')
  const withCommas = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = num.isNegative() ? '-' : ''
  const absWithCommas = withCommas.startsWith('-') ? withCommas.slice(1) : withCommas
  return `${sign}$${absWithCommas}.${decimal}`
}

/** 숫자를 USDT 포맷으로 변환 */
export function formatUSDT(value: string): string {
  const num = new Decimal(value)
  const formatted = num.toFixed(1)
  const [integer, decimal] = formatted.split('.')
  const withCommas = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = num.isNegative() ? '-' : ''
  const absWithCommas = withCommas.startsWith('-') ? withCommas.slice(1) : withCommas
  return `${sign}${absWithCommas}.${decimal} USDT`
}

/** 정수 USDT 포맷 (소수점 없음) */
export function formatUSDTInt(value: string | number): string {
  const num = new Decimal(String(value))
  const integer = num.toFixed(0)
  const withCommas = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = num.isNegative() ? '-' : ''
  const abs = withCommas.startsWith('-') ? withCommas.slice(1) : withCommas
  return `${sign}${abs} USDT`
}

/** $ 포맷 (정수, 콤마 포함) */
export function formatDollar(value: string | number | null | undefined): string {
  if (!value || value === '') return '-'
  const num = new Decimal(String(value))
  const fixed = num.toFixed(0)
  const withCommas = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = num.isNegative() ? '-' : ''
  const abs = withCommas.startsWith('-') ? withCommas.slice(1) : withCommas
  return `${sign}$${abs}`
}

/** 콤마/$ 제거 → 순수 숫자 문자열 */
export function stripFormat(val: string): string {
  return val.replace(/[$,\s]/g, '')
}
