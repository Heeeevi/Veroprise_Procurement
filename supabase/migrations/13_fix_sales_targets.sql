-- =====================================================
-- RECREATE sales_targets TABLE COMPLETELY
-- =====================================================

-- Drop and recreate the table with correct structure
DROP TABLE IF EXISTS sales_targets CASCADE;

CREATE TABLE sales_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    target_amount NUMERIC NOT NULL DEFAULT 0,
    target_date DATE NOT NULL,
    period_type TEXT DEFAULT 'monthly',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;

-- Simple open policies
CREATE POLICY "sales_targets_select_all" ON sales_targets
FOR SELECT USING (true);

CREATE POLICY "sales_targets_insert_all" ON sales_targets
FOR INSERT WITH CHECK (true);

CREATE POLICY "sales_targets_update_all" ON sales_targets
FOR UPDATE USING (true);

CREATE POLICY "sales_targets_delete_owner" ON sales_targets
FOR DELETE USING (public.is_owner(auth.uid()));

-- Add index
CREATE INDEX idx_sales_targets_outlet ON sales_targets(outlet_id);
CREATE INDEX idx_sales_targets_date ON sales_targets(target_date);

COMMENT ON TABLE sales_targets IS 'Sales targets per outlet or product';
