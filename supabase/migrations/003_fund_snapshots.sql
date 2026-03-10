-- fund_snapshots: 자금 변동 추적 테이블
-- 이체/히스토리 연동 시 자금의 흐름과 변동을 기록하여 P&L/ROI 계산에 활용
--
-- 사용 시나리오:
--   1. 이체 완료 시 → snapshot 기록 (입금/출금)
--   2. 포지션 종료 시 → snapshot 기록 (실현 P&L)
--   3. 정산/리밸런싱 시 → snapshot 기록 (잔액 조정)
--
-- 이 테이블은 "변동 로그"이므로, 특정 시점의 잔액은
-- 해당 시점까지의 snapshot을 누적 합산하여 계산

CREATE TABLE fund_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,

  -- 변동 유형
  event_type TEXT NOT NULL CHECK (event_type IN (
    'allocation_in',       -- Head → Trader 할당 입금
    'allocation_out',      -- Trader → Head 반납
    'transfer_to_exchange', -- Trader → 거래소 이체
    'transfer_from_exchange', -- 거래소 → Trader 회수
    'realized_pnl',        -- 포지션 종료 시 실현 손익
    'adjustment'           -- 수동 잔액 조정
  )),

  -- 금액 (양수 = 증가, 음수 = 감소)
  amount_usd NUMERIC(18, 2) NOT NULL,

  -- 변동 후 누적 잔액 (선택적 — 빠른 조회용 스냅샷)
  balance_after_usd NUMERIC(18, 2),

  -- 연결 참조 (어떤 이벤트에서 발생했는지)
  ref_type TEXT CHECK (ref_type IN ('allocation', 'transfer', 'position')),
  ref_id UUID,

  memo TEXT,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_fund_snapshots_trader_id ON fund_snapshots(trader_id);
CREATE INDEX idx_fund_snapshots_date ON fund_snapshots(snapshot_date);
CREATE INDEX idx_fund_snapshots_event ON fund_snapshots(event_type);
CREATE INDEX idx_fund_snapshots_ref ON fund_snapshots(ref_type, ref_id);

-- RLS
ALTER TABLE fund_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_head_manage_snapshots" ON fund_snapshots
  FOR ALL USING (get_user_role() IN ('admin', 'head_trader'));
CREATE POLICY "trader_read_own_snapshots" ON fund_snapshots
  FOR SELECT USING (trader_id = get_trader_id());
