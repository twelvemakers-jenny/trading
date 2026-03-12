'use client'

import { useState, useMemo } from 'react'
import { getFlowOptions } from '@/components/ui/flow-badge'
import { formatUSDT } from '@/lib/calculations'
import type { Trader, Account, Transfer, UserRole } from '@/types/database'

const PURPOSE_LABELS: Record<string, string> = {
  initial: '초기 입금',
  additional: '추가 입금',
  withdrawal: '출금',
  profit_withdrawal: '수익 출금',
}

export function getAccountEmail(account: Account): string {
  const meta = account.metadata as Record<string, string>
  return meta?.gmail || account.alias
}

export { PURPOSE_LABELS }

export interface TransferFormProps {
  traders: Trader[]
  accounts: Account[]
  currentUserRole?: UserRole
  exchangeNames: string[]
  initialValues?: Transfer
  onSubmit: (payload: Record<string, unknown>) => void
  isLoading: boolean
  submitLabel: string
}

export function TransferForm({
  traders,
  accounts,
  currentUserRole,
  exchangeNames,
  initialValues,
  onSubmit,
  isLoading,
  submitLabel,
}: TransferFormProps) {
  const flowOptions = getFlowOptions(currentUserRole)
  const initMeta = initialValues?.metadata as Record<string, string> | undefined

  const [flowType, setFlowType] = useState(
    () => flowOptions.find((o) => o.split('::')[0] === initMeta?.flow_type) ?? ''
  )
  const [traderId, setTraderId] = useState(initialValues?.trader_id ?? '')
  const [accountId, setAccountId] = useState(initialValues?.account_id ?? '')
  const [exchangeA, setExchangeA] = useState(initMeta?.exchange_a ?? '')
  const [amountA, setAmountA] = useState(initMeta?.amount_a ?? '')
  const [exchangeB, setExchangeB] = useState(initMeta?.exchange_b ?? '')
  const [amountB, setAmountB] = useState(initMeta?.amount_b ?? '')
  const [purpose, setPurpose] = useState(initialValues?.purpose ?? '')
  const [transferDate, setTransferDate] = useState(initialValues?.transfer_date ?? '')
  const [memo, setMemo] = useState(initialValues?.memo ?? '')

  const filteredAccounts = useMemo(() => {
    if (!traderId) return []
    return accounts.filter((a) => a.trader_id === traderId)
  }, [accounts, traderId])

  const handleTraderChange = (id: string) => {
    setTraderId(id)
    setAccountId('')
  }

  const totalAmount = useMemo(() => {
    const a = parseFloat(amountA) || 0
    const b = parseFloat(amountB) || 0
    return a + b
  }, [amountA, amountB])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const flow = flowType.split('::')[0]
    onSubmit({
      trader_id: traderId,
      account_id: accountId,
      amount_usd: totalAmount,
      purpose,
      transfer_date: transferDate,
      memo: memo || null,
      metadata: {
        flow_type: flow,
        exchange_a: exchangeA,
        amount_a: amountA,
        exchange_b: exchangeB,
        amount_b: amountB,
      },
    })
  }

  const activeTraders = traders.filter((t) => t.role !== 'admin' && t.status === 'active')

  const inputClass = `w-full px-4 py-2.5 bg-background border border-card-border rounded-lg
    text-foreground focus:outline-none focus:border-accent transition-colors
    [&>option]:bg-[#1e293b] [&>option]:text-white`

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 자금 흐름 */}
      <div>
        <label className="block text-sm text-muted mb-1.5">자금 흐름 <span className="text-danger">*</span></label>
        <select value={flowType} onChange={(e) => setFlowType(e.target.value)} className={inputClass} required>
          <option value="">선택하세요</option>
          {flowOptions.map((opt) => {
            const [, label] = opt.includes('::') ? opt.split('::') : [opt, opt]
            return <option key={opt} value={opt}>{label}</option>
          })}
        </select>
      </div>

      {/* 트레이더 */}
      <div>
        <label className="block text-sm text-muted mb-1.5">트레이더 <span className="text-danger">*</span></label>
        <select value={traderId} onChange={(e) => handleTraderChange(e.target.value)} className={inputClass} required>
          <option value="">선택하세요</option>
          {activeTraders.map((t) => {
            const meta = t.metadata as Record<string, string>
            const email = meta?.email ?? ''
            return <option key={t.id} value={t.id}>{t.name}{email ? ` (${email})` : ''}</option>
          })}
        </select>
      </div>

      {/* 수취 계정 */}
      <div>
        <label className="block text-sm text-muted mb-1.5">계정 (KYC) <span className="text-danger">*</span></label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className={inputClass}
          required
          disabled={!traderId}
        >
          <option value="">{traderId ? '계정 선택' : '트레이더를 먼저 선택하세요'}</option>
          {filteredAccounts.map((a) => (
            <option key={a.id} value={a.id}>{getAccountEmail(a)}</option>
          ))}
        </select>
      </div>

      {/* 거래소 A + 금액 A */}
      <div className="p-3 rounded-lg border border-card-border/50 bg-card-border/5 space-y-3">
        <p className="text-xs font-semibold text-accent">거래소 A</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">거래소 <span className="text-danger">*</span></label>
            <select value={exchangeA} onChange={(e) => setExchangeA(e.target.value)} className={inputClass} required>
              <option value="">선택</option>
              {exchangeNames.map((ex) => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">이체 금액 (USDT) <span className="text-danger">*</span></label>
            <input
              type="text"
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              className={inputClass}
              placeholder="0.00"
              required
            />
          </div>
        </div>
      </div>

      {/* 거래소 B + 금액 B */}
      <div className="p-3 rounded-lg border border-card-border/50 bg-card-border/5 space-y-3">
        <p className="text-xs font-semibold text-violet-400">거래소 B</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">거래소</label>
            <select value={exchangeB} onChange={(e) => setExchangeB(e.target.value)} className={inputClass}>
              <option value="">선택 (선택사항)</option>
              {exchangeNames.map((ex) => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">이체 금액 (USDT)</label>
            <input
              type="text"
              value={amountB}
              onChange={(e) => setAmountB(e.target.value)}
              className={inputClass}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* 합계 표시 */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-card-border/10">
        <span className="text-xs text-muted">합계</span>
        <span className="text-sm font-bold text-foreground">{formatUSDT(String(totalAmount.toFixed(1)))}</span>
      </div>

      {/* 이체 목적 */}
      <div>
        <label className="block text-sm text-muted mb-1.5">이체 목적 <span className="text-danger">*</span></label>
        <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className={inputClass} required>
          <option value="">선택하세요</option>
          {Object.entries(PURPOSE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* 이체 날짜 */}
      <div>
        <label className="block text-sm text-muted mb-1.5">이체 날짜 <span className="text-danger">*</span></label>
        <input
          type="date"
          value={transferDate}
          max="9999-12-31"
          onChange={(e) => setTransferDate(e.target.value)}
          className={inputClass}
          required
        />
      </div>

      {/* 메모 */}
      <div>
        <label className="block text-sm text-muted mb-1.5">메모</label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className={inputClass}
          placeholder="메모 (선택)"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg
                   font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '처리 중...' : submitLabel}
      </button>
    </form>
  )
}
