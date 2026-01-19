-- Stock Opnames table for inventory checking
CREATE TABLE IF NOT EXISTS stock_opnames (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    opname_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'completed'
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Store snapshot of [{ product_id, system_qty, actual_qty, difference, reason }]
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stock_opnames ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view stock opnames" ON stock_opnames FOR SELECT
USING (true); -- Simplify for now, or match warehouse access

CREATE POLICY "Managers can insert stock opnames" ON stock_opnames FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Managers can update stock opnames" ON stock_opnames FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- Trigger for updated_at
CREATE TRIGGER update_stock_opnames_updated_at BEFORE UPDATE ON stock_opnames
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
