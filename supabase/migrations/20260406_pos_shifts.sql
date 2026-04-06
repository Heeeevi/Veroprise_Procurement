-- =====================================================
-- POS SHIFTS TABLE
-- Fix start shift flow used by POS cashier screen.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS pos_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  opening_cash DECIMAL(15,2) NOT NULL DEFAULT 0,
  closing_cash DECIMAL(15,2),
  expected_cash DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_shifts_outlet_user ON pos_shifts(outlet_id, user_id);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_active ON pos_shifts(outlet_id, user_id, ended_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_shifts_one_active_shift
  ON pos_shifts(outlet_id, user_id)
  WHERE ended_at IS NULL;

ALTER TABLE pos_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage pos_shifts" ON pos_shifts;
CREATE POLICY "Authenticated users can manage pos_shifts"
  ON pos_shifts
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_pos_shifts_updated_at ON pos_shifts;
CREATE TRIGGER trg_pos_shifts_updated_at
BEFORE UPDATE ON pos_shifts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES pos_shifts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_shift_id ON transactions(shift_id);
