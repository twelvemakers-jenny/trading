// 12Makers Trading Dashboard - 핵심 타입 정의
// 3단계 권한: Admin > Head Trader > Trader

export type UserRole = 'admin' | 'head_trader' | 'trader'

export type PositionStatus = 'pending' | 'active' | 'closed'
export type PositionDirection = 'long' | 'short'
export type TransferPurpose = 'initial' | 'additional' | 'withdrawal' | 'profit_withdrawal'
export type TransferStatus = 'pending' | 'completed' | 'cancelled'
export type AccountStatus = 'active' | 'dormant' | 'closed' | 'pending'
export type AllocationStatus = 'active' | 'adjusted' | 'closed'

export type Exchange =
  | 'Bitget'
  | 'WOO X'
  | 'Biconomy'
  | 'Picol'
  | 'Jucom'
  | 'Tapbit'
  | 'Digifinex'
  | 'OrangeX'
  | 'MEXC'
  | 'Huobi'

export type Leverage =
  | '10x' | '20x' | '25x' | '30x'
  | '35x' | '40x' | '45x' | '50x'

// 동적 필드 스키마 (JSONB)
export interface FieldDefinition {
  key: string
  label: string
  type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'select'
  required: boolean
  options?: string[] // select 타입용
}

export interface SystemSchema {
  id: string
  entity_type: 'trader' | 'account' | 'exchange' | 'fund_settings' | 'risk_settings'
  fields: FieldDefinition[] | Record<string, unknown>
  created_at: string
  updated_at: string
}

// 펀드 기본 설정
export interface FundSettings {
  fund_name: string
  base_currency: string
  management_fee_pct: string
  performance_fee_pct: string
}

// 리스크 관리 설정
export interface RiskSettings {
  max_drawdown_alert_pct: string
  max_allocation_per_trader_usd: string
  max_position_size_usd: string
  daily_loss_limit_usd: string
}

// 코어 테이블 타입
export interface Trader {
  id: string
  auth_id: string
  name: string
  role: UserRole
  status: AccountStatus
  metadata: Record<string, unknown> // 동적 필드 (JSONB)
  created_at: string
  updated_at: string
}

export interface Allocation {
  id: string
  trader_id: string
  allocated_by: string // Head Trader의 trader_id
  amount_usd: string // decimal.js용 문자열
  status: AllocationStatus
  memo: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  trader_id: string | null
  alias: string
  exchange: Exchange
  status: AccountStatus
  metadata: Record<string, unknown> // 동적 필드 (JSONB)
  created_at: string
  updated_at: string
}

export interface Transfer {
  id: string
  trader_id: string
  account_id: string
  amount_usd: string
  purpose: TransferPurpose
  status: TransferStatus
  transfer_date: string
  memo: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Position {
  id: string
  trader_id: string
  account_id: string
  deposit_usd: string
  closing_balance_usd: string | null
  status: PositionStatus
  direction: PositionDirection
  leverage: Leverage
  entry_date: string | null
  exit_date: string | null
  pnl_usd: string | null // 계산값
  roi_percent: string | null // 계산값
  issue_note: string | null
  metadata: Record<string, unknown>
  transfer_status: TransferStatus
  transfer_completed_at: string | null
  created_at: string
  updated_at: string
}

// 자금 변동 추적 (이체/히스토리 연동용)
export type SnapshotEventType =
  | 'allocation_in'
  | 'allocation_out'
  | 'transfer_to_exchange'
  | 'transfer_from_exchange'
  | 'realized_pnl'
  | 'adjustment'

export interface FundSnapshot {
  id: string
  trader_id: string
  event_type: SnapshotEventType
  amount_usd: string
  balance_after_usd: string | null
  ref_type: 'allocation' | 'transfer' | 'position' | null
  ref_id: string | null
  memo: string | null
  snapshot_date: string
  created_at: string
}
