-- =====================================================
-- VEROPRISE ERP - SCHEMA FIX
-- Harus dijalankan KETUJUH setelah 06_rls_policy_fix.sql
-- Menambahkan tabel dan kolom yang kurang
-- =====================================================

-- =====================================================
-- POS_SHIFTS - Untuk shift kasir di POS
-- =====================================================
CREATE TABLE IF NOT EXISTS pos_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    opening_cash DECIMAL(15,2) NOT NULL DEFAULT 0,
    closing_cash DECIMAL(15,2),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_pos_shifts_outlet ON pos_shifts(outlet_id);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_user ON pos_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_active ON pos_shifts(outlet_id, user_id) WHERE ended_at IS NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_pos_shifts_updated_at ON pos_shifts;
CREATE TRIGGER update_pos_shifts_updated_at 
    BEFORE UPDATE ON pos_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for pos_shifts
ALTER TABLE pos_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shifts" ON pos_shifts FOR SELECT
USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
));

CREATE POLICY "Users can insert their own shifts" ON pos_shifts FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own shifts" ON pos_shifts FOR UPDATE
USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
));

-- =====================================================
-- Add missing columns to transactions table
-- =====================================================
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES pos_shifts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- =====================================================
-- Add missing columns to bookings table for frontend compatibility
-- =====================================================
-- The bookings table already has booking_date and booking_time
-- Add payment_amount and payment_method if not exists
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id);

-- =====================================================
-- PAYROLL tables for HR module
-- =====================================================
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    period TEXT NOT NULL, -- Format: YYYY-MM
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, paid
    created_by UUID REFERENCES profiles(id),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(outlet_id, period)
);

CREATE TABLE IF NOT EXISTS payroll_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    base_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
    allowances DECIMAL(15,2) NOT NULL DEFAULT 0,
    deductions DECIMAL(15,2) NOT NULL DEFAULT 0,
    net_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for payroll tables
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payroll in their outlets" ON payroll_runs FOR SELECT
USING (EXISTS (
    SELECT 1 FROM user_outlets WHERE user_id = auth.uid() AND outlet_id = payroll_runs.outlet_id
) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
));

CREATE POLICY "Owners can manage payroll" ON payroll_runs FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Users can view payroll items" ON payroll_items FOR SELECT
USING (EXISTS (
    SELECT 1 FROM payroll_runs pr 
    WHERE pr.id = payroll_items.payroll_run_id
    AND EXISTS (
        SELECT 1 FROM user_outlets WHERE user_id = auth.uid() AND outlet_id = pr.outlet_id
    )
));

CREATE POLICY "Owners can manage payroll items" ON payroll_items FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- =====================================================
-- EXPENSE_CATEGORIES table for categorizing expenses
-- =====================================================
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add category_id to expenses if not exists
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES expense_categories(id);

-- RLS for expense_categories
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view expense categories" ON expense_categories FOR SELECT
USING (true);

CREATE POLICY "Owners can manage expense categories" ON expense_categories FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- =====================================================
-- MULTI-PAYMENT SUPPORT
-- =====================================================
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_due DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_split_payment BOOLEAN DEFAULT false;

-- =====================================================
-- ATTENDANCE TABLE - Linked to POS Shifts
-- =====================================================
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES pos_shifts(id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'present', -- present, absent, late, leave
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, attendance_date)
);

ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attendances" ON attendances FOR SELECT
USING (EXISTS (
    SELECT 1 FROM user_outlets WHERE user_id = auth.uid() AND outlet_id = attendances.outlet_id
) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
));

CREATE POLICY "Staff can insert own attendance" ON attendances FOR INSERT
WITH CHECK (true);

CREATE POLICY "Managers can manage attendances" ON attendances FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- =====================================================
-- SALES TARGETS & BONUSES
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, monthly
    target_quantity INTEGER NOT NULL DEFAULT 0,
    bonus_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_bonuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_item_id UUID REFERENCES payroll_items(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    bonus_type TEXT NOT NULL, -- 'target_achievement', 'attendance', 'performance'
    description TEXT,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    achievement_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sales targets" ON sales_targets FOR SELECT
USING (true);

CREATE POLICY "Managers can manage sales targets" ON sales_targets FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Users can view bonuses" ON employee_bonuses FOR SELECT
USING (true);

CREATE POLICY "Managers can manage bonuses" ON employee_bonuses FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- =====================================================
-- DAILY CLOSING REPORTS
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_closings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES pos_shifts(id) ON DELETE SET NULL,
    closing_date DATE NOT NULL,
    total_sales DECIMAL(15,2) NOT NULL DEFAULT 0,
    cash_sales DECIMAL(15,2) NOT NULL DEFAULT 0,
    qris_sales DECIMAL(15,2) NOT NULL DEFAULT 0,
    transfer_sales DECIMAL(15,2) NOT NULL DEFAULT 0,
    olshop_sales DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_expenses DECIMAL(15,2) NOT NULL DEFAULT 0,
    cash_to_deposit DECIMAL(15,2) NOT NULL DEFAULT 0,
    opening_cash DECIMAL(15,2) NOT NULL DEFAULT 0,
    closing_cash DECIMAL(15,2) NOT NULL DEFAULT 0,
    discrepancy DECIMAL(15,2) NOT NULL DEFAULT 0,
    stock_snapshot JSONB DEFAULT '[]'::jsonb,
    closed_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(outlet_id, closing_date)
);

ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view closings" ON daily_closings FOR SELECT
USING (EXISTS (
    SELECT 1 FROM user_outlets WHERE user_id = auth.uid() AND outlet_id = daily_closings.outlet_id
) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
));

CREATE POLICY "Staff can insert closings" ON daily_closings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Managers can manage closings" ON daily_closings FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- Add bonus column to payroll_items
ALTER TABLE payroll_items 
ADD COLUMN IF NOT EXISTS bonus DECIMAL(15,2) DEFAULT 0;

COMMENT ON SCHEMA public IS 'Veroprise ERP - Schema Fix v1.1 with Multi-Payment, Attendance, Bonus';
