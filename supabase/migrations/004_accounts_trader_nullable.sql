-- 계정원장: trader_id를 선택사항으로 변경
-- 트레이더 미배정 계정도 등록 가능하도록
ALTER TABLE accounts ALTER COLUMN trader_id DROP NOT NULL;
