import type { UserRole } from '@/types/database'

// 자금 흐름 방향 정의
export type FlowType =
  | 'company_to_head'     // Company → Head Fund
  | 'head_to_trader'      // Head Fund → Trader Fund
  | 'trader_to_exchange'  // Trader Fund → Exchange
  | 'exchange_to_trader'  // Exchange → Trader Fund
  | 'trader_to_head'      // Trader Fund → Head Fund
  | 'head_to_company'     // Head Fund → Company

interface FlowConfig {
  label: string
  from: string
  to: string
  color: string
  arrow: string
}

export const FLOW_CONFIG: Record<FlowType, FlowConfig> = {
  company_to_head:    { label: 'Company → Head Fund',     from: 'Company',      to: 'Head Fund',    color: 'bg-blue-500/20 text-blue-400',   arrow: '→' },
  head_to_trader:     { label: 'Head Fund → Trader Fund',  from: 'Head Fund',    to: 'Trader Fund',  color: 'bg-emerald-500/20 text-emerald-400', arrow: '→' },
  trader_to_exchange: { label: 'Trader → Exchange',        from: 'Trader Fund',  to: 'Exchange',     color: 'bg-amber-500/20 text-amber-400', arrow: '→' },
  exchange_to_trader: { label: 'Exchange → Trader Fund',   from: 'Exchange',     to: 'Trader Fund',  color: 'bg-violet-500/20 text-violet-400', arrow: '←' },
  trader_to_head:     { label: 'Trader Fund → Head Fund',  from: 'Trader Fund',  to: 'Head Fund',    color: 'bg-rose-500/20 text-rose-400',   arrow: '←' },
  head_to_company:    { label: 'Head Fund → Company',      from: 'Head Fund',    to: 'Company',      color: 'bg-cyan-500/20 text-cyan-400',   arrow: '←' },
}

// 역할별 보이는 흐름
// 펀드운용 페이지용 흐름 (거래소 이체는 이체원장에서 관리)
const ADMIN_FLOWS: FlowType[] = [
  'company_to_head', 'head_to_trader', 'trader_to_head', 'head_to_company',
]

const TRADER_FLOWS: FlowType[] = [
  'head_to_trader', 'trader_to_head',
]

// 이체원장 등 전체 흐름이 필요한 곳에서 사용
const ALL_FLOWS: FlowType[] = [
  'company_to_head', 'head_to_trader', 'trader_to_exchange',
  'exchange_to_trader', 'trader_to_head', 'head_to_company',
]

export function getFlowsByRole(role: UserRole | undefined): FlowType[] {
  if (role === 'admin' || role === 'head_trader') return ADMIN_FLOWS
  return TRADER_FLOWS
}

// 이체원장 등에서 전체 흐름 타입 필요 시 사용
export function getAllFlows(): FlowType[] {
  return ALL_FLOWS
}

export function getFlowOptions(role: UserRole | undefined): string[] {
  return getFlowsByRole(role).map((f) => `${f}::${FLOW_CONFIG[f].label}`)
}

export function FlowBadge({ flow, size }: { flow: string; size?: 'sm' | 'default' }) {
  const config = FLOW_CONFIG[flow as FlowType]
  if (!config) return <span className="text-xs text-muted">{flow}</span>

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${config.color}`}>
        <span>{config.from}</span>
        <span className="opacity-60">{config.arrow}</span>
        <span>{config.to}</span>
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      <span>{config.from}</span>
      <span className="opacity-60">{config.arrow}</span>
      <span>{config.to}</span>
    </span>
  )
}

// 흐름 필터 탭 컴포넌트
export function FlowFilter({
  flows,
  activeFlow,
  onSelect,
}: {
  flows: FlowType[]
  activeFlow: string | null
  onSelect: (flow: string | null) => void
}) {
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 text-xs rounded-lg transition-colors
          ${activeFlow === null
            ? 'bg-accent text-white'
            : 'bg-card-border/30 text-muted hover:text-foreground'
          }`}
      >
        전체
      </button>
      {flows.map((f) => {
        const config = FLOW_CONFIG[f]
        return (
          <button
            key={f}
            onClick={() => onSelect(f)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors
              ${activeFlow === f
                ? 'bg-accent text-white'
                : 'bg-card-border/30 text-muted hover:text-foreground'
              }`}
          >
            {config.label}
          </button>
        )
      })}
    </div>
  )
}
