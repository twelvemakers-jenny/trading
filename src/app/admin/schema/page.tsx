'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { useSystemSchema, useUpdate, useInsert, type ExchangeConfig } from '@/lib/hooks/use-data'
import type { FundSettings, RiskSettings } from '@/types/database'

const DEFAULT_EXCHANGES: ExchangeConfig[] = [
  { name: 'Bitget', color: '#00c8b5', rebate_pct: '', reward_pct: '', event_url: '' },
  { name: 'WOO X', color: '#5b9cf6', rebate_pct: '', reward_pct: '', event_url: '' },
  { name: 'Biconomy', color: '#7b61ff', rebate_pct: '', reward_pct: '', event_url: '' },
  { name: 'Picol', color: '#e91e63', rebate_pct: '', reward_pct: '', event_url: '' },
  { name: 'Jucom', color: '#ff9800', rebate_pct: '', reward_pct: '', event_url: '' },
  { name: 'Tapbit', color: '#f7931a', rebate_pct: '', reward_pct: '', event_url: '' },
  { name: 'Digifinex', color: '#2b6def', rebate_pct: '', reward_pct: '', event_url: '' },
  { name: 'OrangeX', color: '#ff5722', rebate_pct: '', reward_pct: '', event_url: '' },
  { name: 'MEXC', color: '#2196f3', rebate_pct: '', reward_pct: '', event_url: '' },
  { name: 'Huobi', color: '#009688', rebate_pct: '', reward_pct: '', event_url: '' },
]

const DEFAULT_FUND_SETTINGS: FundSettings = {
  fund_name: '',
  base_currency: 'USDT',
  management_fee_pct: '',
  performance_fee_pct: '',
}

const DEFAULT_RISK_SETTINGS: RiskSettings = {
  max_drawdown_alert_pct: '',
  max_allocation_per_trader_usd: '',
  max_position_size_usd: '',
  daily_loss_limit_usd: '',
}

export default function SchemaPage() {
  const { data: exchangeSchema, isLoading: eLoading } = useSystemSchema('exchange')
  const { data: fundSchema, isLoading: fLoading } = useSystemSchema('fund_settings')
  const { data: riskSchema, isLoading: rLoading } = useSystemSchema('risk_settings')

  return (
    <DashboardLayout>
      <PageHeader title="설정" description="펀드 기본 정보, 리스크 관리, 거래소 관리" />
      <div className="space-y-8">
        <FundSettingsEditor schema={fundSchema} isLoading={fLoading} />
        <RiskSettingsEditor schema={riskSchema} isLoading={rLoading} />
        <ExchangeEditor schema={exchangeSchema} isLoading={eLoading} />
      </div>
    </DashboardLayout>
  )
}

// ── 펀드 기본 정보 ──
function FundSettingsEditor({
  schema,
  isLoading,
}: {
  schema: { id: string; fields: unknown } | undefined
  isLoading: boolean
}) {
  const existing = (schema?.fields as unknown as FundSettings) ?? null
  const [settings, setSettings] = useState<FundSettings>(DEFAULT_FUND_SETTINGS)
  const [synced, setSynced] = useState(true)
  const updateSchema = useUpdate<Record<string, unknown>>('system_schema', ['system_schema'])
  const insertSchema = useInsert<Record<string, unknown>>('system_schema', ['system_schema'])

  useEffect(() => {
    if (!isLoading && existing) {
      setSettings(existing)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  const update = (patch: Partial<FundSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    setSynced(false)
  }

  const handleSave = () => {
    if (schema) {
      updateSchema.mutate(
        { id: schema.id, fields: settings as unknown as Record<string, unknown> },
        { onSuccess: () => setSynced(true) }
      )
    } else {
      insertSchema.mutate(
        { entity_type: 'fund_settings', fields: settings as unknown as Record<string, unknown> },
        { onSuccess: () => setSynced(true) }
      )
    }
  }

  if (isLoading) {
    return <div className="glass-card p-6 text-muted text-sm">로딩 중...</div>
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">펀드 기본 정보</h3>
        <button
          onClick={handleSave}
          disabled={synced || updateSchema.isPending || insertSchema.isPending}
          className="px-3 py-1.5 text-xs bg-success/20 text-success rounded hover:bg-success/30
                     transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {(updateSchema.isPending || insertSchema.isPending) ? '저장 중...' : '저장'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-muted">펀드명</label>
          <input
            type="text"
            placeholder="Delta Trading Fund"
            value={settings.fund_name}
            onChange={(e) => update({ fund_name: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-card-border rounded text-sm text-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted">기본 통화</label>
          <select
            value={settings.base_currency}
            onChange={(e) => update({ base_currency: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-card-border rounded text-sm text-foreground
                       [&>option]:bg-[#1e293b] [&>option]:text-white"
          >
            <option value="USDT">USDT</option>
            <option value="USD">USD</option>
            <option value="USDC">USDC</option>
            <option value="KRW">KRW</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted">운용 수수료 (%)</label>
          <input
            type="text"
            placeholder="2.00"
            value={settings.management_fee_pct}
            onChange={(e) => update({ management_fee_pct: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-card-border rounded text-sm text-foreground"
          />
          <p className="text-[10px] text-muted">연간 운용 자산 대비 수수료율</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted">성과 수수료 (%)</label>
          <input
            type="text"
            placeholder="20.00"
            value={settings.performance_fee_pct}
            onChange={(e) => update({ performance_fee_pct: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-card-border rounded text-sm text-foreground"
          />
          <p className="text-[10px] text-muted">수익 발생 시 성과 보수율 (High-Water Mark 기준)</p>
        </div>
      </div>
    </div>
  )
}

// ── 리스크 관리 설정 ──
function RiskSettingsEditor({
  schema,
  isLoading,
}: {
  schema: { id: string; fields: unknown } | undefined
  isLoading: boolean
}) {
  const existing = (schema?.fields as unknown as RiskSettings) ?? null
  const [settings, setSettings] = useState<RiskSettings>(DEFAULT_RISK_SETTINGS)
  const [synced, setSynced] = useState(true)
  const updateSchema = useUpdate<Record<string, unknown>>('system_schema', ['system_schema'])
  const insertSchema = useInsert<Record<string, unknown>>('system_schema', ['system_schema'])

  useEffect(() => {
    if (!isLoading && existing) {
      setSettings(existing)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  const update = (patch: Partial<RiskSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    setSynced(false)
  }

  const handleSave = () => {
    if (schema) {
      updateSchema.mutate(
        { id: schema.id, fields: settings as unknown as Record<string, unknown> },
        { onSuccess: () => setSynced(true) }
      )
    } else {
      insertSchema.mutate(
        { entity_type: 'risk_settings', fields: settings as unknown as Record<string, unknown> },
        { onSuccess: () => setSynced(true) }
      )
    }
  }

  if (isLoading) {
    return <div className="glass-card p-6 text-muted text-sm">로딩 중...</div>
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">리스크 관리</h3>
        <button
          onClick={handleSave}
          disabled={synced || updateSchema.isPending || insertSchema.isPending}
          className="px-3 py-1.5 text-xs bg-success/20 text-success rounded hover:bg-success/30
                     transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {(updateSchema.isPending || insertSchema.isPending) ? '저장 중...' : '저장'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-muted">최대 손실 알림 (%)</label>
          <input
            type="text"
            placeholder="10.00"
            value={settings.max_drawdown_alert_pct}
            onChange={(e) => update({ max_drawdown_alert_pct: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-card-border rounded text-sm text-foreground"
          />
          <p className="text-[10px] text-muted">전체 자산 대비 손실이 이 비율을 초과하면 알림</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted">일일 손실 한도 (USD)</label>
          <input
            type="text"
            placeholder="5000"
            value={settings.daily_loss_limit_usd}
            onChange={(e) => update({ daily_loss_limit_usd: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-card-border rounded text-sm text-foreground"
          />
          <p className="text-[10px] text-muted">하루 최대 허용 손실 금액</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted">트레이더당 최대 배정 (USD)</label>
          <input
            type="text"
            placeholder="50000"
            value={settings.max_allocation_per_trader_usd}
            onChange={(e) => update({ max_allocation_per_trader_usd: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-card-border rounded text-sm text-foreground"
          />
          <p className="text-[10px] text-muted">개별 트레이더에게 배정 가능한 최대 금액</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted">포지션당 최대 금액 (USD)</label>
          <input
            type="text"
            placeholder="10000"
            value={settings.max_position_size_usd}
            onChange={(e) => update({ max_position_size_usd: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-card-border rounded text-sm text-foreground"
          />
          <p className="text-[10px] text-muted">단일 포지션 최대 투입 금액</p>
        </div>
      </div>
    </div>
  )
}

// ── 거래소 관리 에디터 ──
function ExchangeEditor({
  schema,
  isLoading,
}: {
  schema: { id: string; fields: unknown } | undefined
  isLoading: boolean
}) {
  const existing = (schema?.fields as unknown as ExchangeConfig[]) ?? []
  const [exchanges, setExchanges] = useState<ExchangeConfig[]>([])
  const [synced, setSynced] = useState(true)
  const updateSchema = useUpdate<Record<string, unknown>>('system_schema', ['system_schema'])
  const insertSchema = useInsert<Record<string, unknown>>('system_schema', ['system_schema'])

  useEffect(() => {
    if (!isLoading) {
      setExchanges(existing.length > 0 ? existing : DEFAULT_EXCHANGES)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  const addExchange = () => {
    setExchanges((prev) => [
      ...prev,
      { name: '', color: '#6b7280', rebate_pct: '', reward_pct: '', event_url: '' },
    ])
    setSynced(false)
  }

  const removeExchange = (index: number) => {
    setExchanges((prev) => prev.filter((_, i) => i !== index))
    setSynced(false)
  }

  const updateExchange = (index: number, patch: Partial<ExchangeConfig>) => {
    setExchanges((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...patch } : e))
    )
    setSynced(false)
  }

  const handleSave = () => {
    if (schema) {
      updateSchema.mutate(
        { id: schema.id, fields: exchanges as unknown as Record<string, unknown>[] },
        { onSuccess: () => setSynced(true) }
      )
    } else {
      insertSchema.mutate(
        { entity_type: 'exchange', fields: exchanges as unknown as Record<string, unknown>[] },
        { onSuccess: () => setSynced(true) }
      )
    }
  }

  if (isLoading) {
    return <div className="glass-card p-6 text-muted text-sm">로딩 중...</div>
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">거래소 관리</h3>
        <div className="flex gap-2">
          <button
            onClick={addExchange}
            className="px-3 py-1.5 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30 transition-colors"
          >
            + 거래소 추가
          </button>
          <button
            onClick={handleSave}
            disabled={synced || updateSchema.isPending || insertSchema.isPending}
            className="px-3 py-1.5 text-xs bg-success/20 text-success rounded hover:bg-success/30
                       transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {(updateSchema.isPending || insertSchema.isPending) ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {exchanges.map((ex, i) => (
          <div key={i} className="p-4 bg-background/50 rounded-lg space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={ex.color}
                  onChange={(e) => updateExchange(i, { color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  placeholder="거래소 이름"
                  value={ex.name}
                  onChange={(e) => updateExchange(i, { name: e.target.value })}
                  className="w-36 px-3 py-1.5 bg-background border border-card-border rounded text-sm text-foreground"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted whitespace-nowrap">Rebate %</label>
                <input
                  type="text"
                  placeholder="0.00"
                  value={ex.rebate_pct}
                  onChange={(e) => updateExchange(i, { rebate_pct: e.target.value })}
                  className="w-20 px-2 py-1.5 bg-background border border-card-border rounded text-sm text-foreground text-center"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted whitespace-nowrap">Reward %</label>
                <input
                  type="text"
                  placeholder="0.00"
                  value={ex.reward_pct}
                  onChange={(e) => updateExchange(i, { reward_pct: e.target.value })}
                  className="w-20 px-2 py-1.5 bg-background border border-card-border rounded text-sm text-foreground text-center"
                />
              </div>
              <button
                onClick={() => removeExchange(i)}
                className="text-danger hover:text-danger/80 text-sm ml-auto"
              >
                삭제
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-muted whitespace-nowrap">이벤트 페이지</label>
              <input
                type="url"
                placeholder="https://..."
                value={ex.event_url}
                onChange={(e) => updateExchange(i, { event_url: e.target.value })}
                className="flex-1 px-3 py-1.5 bg-background border border-card-border rounded text-sm text-foreground"
              />
              {ex.event_url && (
                <a
                  href={ex.event_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:text-accent-hover whitespace-nowrap"
                >
                  열기
                </a>
              )}
            </div>
          </div>
        ))}
        {exchanges.length === 0 && (
          <p className="text-muted text-sm text-center py-4">
            등록된 거래소가 없습니다.
          </p>
        )}
      </div>
    </div>
  )
}
