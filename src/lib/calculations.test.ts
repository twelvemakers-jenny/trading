import { describe, it, expect } from 'vitest'
import {
  calculatePnL,
  calculateROI,
  sumAmounts,
  calculateRemainingAllocation,
  formatUSD,
} from './calculations'

describe('calculatePnL', () => {
  it('종료잔액이 없으면 0 반환', () => {
    expect(calculatePnL('10000', null)).toBe('0')
  })

  it('수익 포지션 P&L 계산', () => {
    expect(calculatePnL('10000', '12500')).toBe('2500.00')
  })

  it('손실 포지션 P&L 계산', () => {
    expect(calculatePnL('10000', '7300')).toBe('-2700.00')
  })

  it('부동소수점 정밀도 유지', () => {
    expect(calculatePnL('0.1', '0.3')).toBe('0.20')
  })
})

describe('calculateROI', () => {
  it('종료잔액이 없으면 0 반환', () => {
    expect(calculateROI('10000', null)).toBe('0')
  })

  it('예치금이 0이면 0 반환', () => {
    expect(calculateROI('0', '500')).toBe('0')
  })

  it('25% 수익 ROI', () => {
    expect(calculateROI('10000', '12500')).toBe('25.00')
  })

  it('-27% 손실 ROI', () => {
    expect(calculateROI('10000', '7300')).toBe('-27.00')
  })

  it('소수점 ROI 정밀 계산', () => {
    expect(calculateROI('3000', '3150')).toBe('5.00')
  })
})

describe('sumAmounts', () => {
  it('빈 배열은 0 반환', () => {
    expect(sumAmounts([])).toBe('0.00')
  })

  it('여러 금액 합산', () => {
    expect(sumAmounts(['10000', '5000', '3000'])).toBe('18000.00')
  })

  it('부동소수점 정밀 합산', () => {
    expect(sumAmounts(['0.1', '0.2'])).toBe('0.30')
  })
})

describe('calculateRemainingAllocation', () => {
  it('잔여 할당금 계산', () => {
    expect(calculateRemainingAllocation('100000', '80000')).toBe('20000.00')
  })

  it('초과 이체 시 음수 반환', () => {
    expect(calculateRemainingAllocation('50000', '55000')).toBe('-5000.00')
  })
})

describe('formatUSD', () => {
  it('양수 포맷', () => {
    expect(formatUSD('12500.50')).toBe('$12,500.50')
  })

  it('음수 포맷', () => {
    expect(formatUSD('-2700')).toBe('-$2,700.00')
  })

  it('0 포맷', () => {
    expect(formatUSD('0')).toBe('$0.00')
  })

  it('큰 숫자 포맷', () => {
    expect(formatUSD('1234567.89')).toBe('$1,234,567.89')
  })
})
