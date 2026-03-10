-- 12Makers Trading Dashboard 초기 스키마
-- 5대 테이블 + 동적 스키마 테이블 + RLS 보안

-- ============================================================
-- 1. 동적 필드 스키마 (관리자가 UI에서 필드 추가/삭제 가능)
-- ============================================================
CREATE TABLE system_schema (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('trader', 'account')),
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (entity_type)
);

-- ============================================================
-- 2. 트레이더 (프로필)
-- ============================================================
CREATE TABLE traders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'trader' CHECK (role IN ('admin', 'head_trader', 'trader')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dormant', 'closed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (auth_id)
);

-- ============================================================
-- 3. 펀드 할당 (Head Trader → Trader)
-- ============================================================
CREATE TABLE allocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
  allocated_by UUID NOT NULL REFERENCES traders(id),
  amount_usd NUMERIC(18, 2) NOT NULL CHECK (amount_usd > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'adjusted', 'closed')),
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. 거래소 계정
-- ============================================================
CREATE TABLE accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  exchange TEXT NOT NULL CHECK (exchange IN (
    'Bitget', 'WOO X', 'Biconomy', 'Picol', 'Jucom',
    'Tapbit', 'Digifinex', 'OrangeX', 'MEXC', 'Huobi'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dormant', 'closed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. 이체 원장
-- ============================================================
CREATE TABLE transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount_usd NUMERIC(18, 2) NOT NULL CHECK (amount_usd > 0),
  purpose TEXT NOT NULL CHECK (purpose IN ('initial', 'additional', 'withdrawal', 'profit_withdrawal')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. 포지션
-- ============================================================
CREATE TABLE positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  deposit_usd NUMERIC(18, 2) NOT NULL CHECK (deposit_usd >= 0),
  closing_balance_usd NUMERIC(18, 2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed')),
  direction TEXT NOT NULL DEFAULT 'long' CHECK (direction IN ('long', 'short')),
  leverage TEXT NOT NULL DEFAULT '10x' CHECK (leverage IN (
    '10x', '20x', '25x', '30x', '35x', '40x', '45x', '50x'
  )),
  entry_date DATE,
  exit_date DATE,
  pnl_usd NUMERIC(18, 2) GENERATED ALWAYS AS (
    CASE WHEN closing_balance_usd IS NOT NULL
      THEN closing_balance_usd - deposit_usd
      ELSE NULL
    END
  ) STORED,
  roi_percent NUMERIC(8, 2) GENERATED ALWAYS AS (
    CASE WHEN closing_balance_usd IS NOT NULL AND deposit_usd > 0
      THEN ROUND((closing_balance_usd - deposit_usd) / deposit_usd * 100, 2)
      ELSE NULL
    END
  ) STORED,
  issue_note TEXT,
  transfer_status TEXT NOT NULL DEFAULT 'pending' CHECK (transfer_status IN ('pending', 'completed', 'cancelled')),
  transfer_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 인덱스
-- ============================================================
CREATE INDEX idx_traders_auth_id ON traders(auth_id);
CREATE INDEX idx_traders_role ON traders(role);
CREATE INDEX idx_allocations_trader_id ON allocations(trader_id);
CREATE INDEX idx_accounts_trader_id ON accounts(trader_id);
CREATE INDEX idx_accounts_exchange ON accounts(exchange);
CREATE INDEX idx_transfers_trader_id ON transfers(trader_id);
CREATE INDEX idx_transfers_account_id ON transfers(account_id);
CREATE INDEX idx_positions_trader_id ON positions(trader_id);
CREATE INDEX idx_positions_account_id ON positions(account_id);
CREATE INDEX idx_positions_status ON positions(status);

-- ============================================================
-- RLS (Row Level Security) - 3단계 권한
-- ============================================================
ALTER TABLE traders ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_schema ENABLE ROW LEVEL SECURITY;

-- Helper: 현재 사용자의 역할 조회
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM traders WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: 현재 사용자의 trader_id 조회
CREATE OR REPLACE FUNCTION get_trader_id()
RETURNS UUID AS $$
  SELECT id FROM traders WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- system_schema: Admin만 읽기/쓰기
CREATE POLICY "admin_manage_schema" ON system_schema
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "all_read_schema" ON system_schema
  FOR SELECT USING (true);

-- traders: Admin은 전체, 본인은 본인만
CREATE POLICY "admin_manage_traders" ON traders
  FOR ALL USING (get_user_role() IN ('admin', 'head_trader'));
CREATE POLICY "trader_read_self" ON traders
  FOR SELECT USING (auth_id = auth.uid());

-- allocations: Admin/Head는 전체, Trader는 본인만
CREATE POLICY "admin_head_manage_allocations" ON allocations
  FOR ALL USING (get_user_role() IN ('admin', 'head_trader'));
CREATE POLICY "trader_read_own_allocations" ON allocations
  FOR SELECT USING (trader_id = get_trader_id());

-- accounts: Admin/Head는 전체, Trader는 본인만
CREATE POLICY "admin_head_manage_accounts" ON accounts
  FOR ALL USING (get_user_role() IN ('admin', 'head_trader'));
CREATE POLICY "trader_manage_own_accounts" ON accounts
  FOR ALL USING (trader_id = get_trader_id());

-- transfers: Admin/Head는 전체, Trader는 본인만
CREATE POLICY "admin_head_manage_transfers" ON transfers
  FOR ALL USING (get_user_role() IN ('admin', 'head_trader'));
CREATE POLICY "trader_manage_own_transfers" ON transfers
  FOR ALL USING (trader_id = get_trader_id());

-- positions: Admin/Head는 전체, Trader는 본인만
CREATE POLICY "admin_head_manage_positions" ON positions
  FOR ALL USING (get_user_role() IN ('admin', 'head_trader'));
CREATE POLICY "trader_manage_own_positions" ON positions
  FOR ALL USING (trader_id = get_trader_id());

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_traders_updated_at
  BEFORE UPDATE ON traders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_allocations_updated_at
  BEFORE UPDATE ON allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_positions_updated_at
  BEFORE UPDATE ON positions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_system_schema_updated_at
  BEFORE UPDATE ON system_schema FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 초기 데이터: 동적 스키마 기본값
-- ============================================================
INSERT INTO system_schema (entity_type, fields) VALUES
('trader', '[
  {"key": "email", "label": "이메일", "type": "email", "required": true},
  {"key": "phone", "label": "연락처", "type": "phone", "required": false},
  {"key": "telegram", "label": "텔레그램", "type": "text", "required": false}
]'::jsonb),
('account', '[
  {"key": "account_email", "label": "계정 이메일", "type": "email", "required": true},
  {"key": "account_phone", "label": "계정 연락처", "type": "phone", "required": false},
  {"key": "security_note", "label": "보안 메모", "type": "text", "required": false}
]'::jsonb);
