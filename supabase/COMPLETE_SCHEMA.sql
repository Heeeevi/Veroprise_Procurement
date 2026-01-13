-- ============================================================================
-- VEROPRISE ERP + BOOKING SYSTEM - COMPLETE SCHEMA
-- Database: PostgreSQL (Supabase)
-- Version: 1.0
-- Date: 2026-01-12
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 1: USER MANAGEMENT & AUTHENTICATION
-- ============================================================================

-- User Roles Enum
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('owner', 'manager', 'staff', 'investor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- User Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================================================
-- SECTION 2: OUTLET MANAGEMENT
-- ============================================================================

-- Outlets Table
CREATE TABLE IF NOT EXISTS public.outlets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Outlet Mapping
CREATE TABLE IF NOT EXISTS public.user_outlets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, outlet_id)
);

-- ============================================================================
-- SECTION 3: PRODUCT & INVENTORY
-- ============================================================================

-- Product Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Items
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'pcs',
    min_stock NUMERIC(12, 2) DEFAULT 0,
    current_stock NUMERIC(12, 2) DEFAULT 0,
    cost_per_unit NUMERIC(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outlet Inventory (stock per outlet)
CREATE TABLE IF NOT EXISTS public.outlet_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(outlet_id, inventory_item_id)
);

-- Inventory Transaction Types
DO $$ BEGIN
    CREATE TYPE inventory_transaction_type AS ENUM (
        'purchase', 'usage', 'waste', 'transfer_in', 'transfer_out', 'adjustment'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Inventory Transactions
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type inventory_transaction_type NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Recipes (BOM - Bill of Materials)
CREATE TABLE IF NOT EXISTS public.product_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 4) NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, inventory_item_id)
);

-- ============================================================================
-- SECTION 4: TRANSACTIONS & SALES
-- ============================================================================

-- Payment Methods
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'qris', 'transfer', 'card', 'split');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Shifts (Kasir Shift)
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    opening_cash NUMERIC(12, 2) DEFAULT 0,
    closing_cash NUMERIC(12, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (Sales)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_number TEXT NOT NULL UNIQUE,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) DEFAULT 0,
    tax NUMERIC(12, 2) DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method payment_method NOT NULL DEFAULT 'cash',
    payment_details JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction Items
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL,
    cost_price NUMERIC(12, 2) DEFAULT 0,
    subtotal NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 5: EXPENSES & FINANCE
-- ============================================================================

-- Expense Status
DO $$ BEGIN
    CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Expense Categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    receipt_url TEXT,
    status expense_status DEFAULT 'pending',
    notes TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 6: VENDORS & PURCHASE ORDERS
-- ============================================================================

-- Partner Vendors
CREATE TABLE IF NOT EXISTS public.partner_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES public.partner_vendors(id) ON DELETE SET NULL,
    po_number TEXT NOT NULL UNIQUE,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date DATE,
    total_amount NUMERIC(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 2) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    received_quantity NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 7: HR & PAYROLL
-- ============================================================================

-- Employees
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES public.outlets(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    employee_number TEXT UNIQUE,
    position TEXT,
    phone TEXT,
    email TEXT,
    hire_date DATE,
    salary NUMERIC(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance Logs
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll Runs
CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
    total_amount NUMERIC(12, 2) DEFAULT 0,
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll Items
CREATE TABLE IF NOT EXISTS public.payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    base_salary NUMERIC(12, 2) DEFAULT 0,
    bonus NUMERIC(12, 2) DEFAULT 0,
    deductions NUMERIC(12, 2) DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL,
    days_worked INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 8: BOOKING SYSTEM (BARBERSHOP)
-- ============================================================================

-- Booking Status
DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'canceled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Booking Payment Status
DO $$ BEGIN
    CREATE TYPE booking_payment_status AS ENUM ('unpaid', 'paid', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    slot_time TIMESTAMPTZ NOT NULL,
    status booking_status DEFAULT 'pending',
    payment_status booking_payment_status DEFAULT 'unpaid',
    payment_amount NUMERIC(10, 2) DEFAULT 10000.00,
    payment_method payment_method DEFAULT 'qris',
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 9: AUDIT & LOGGING
-- ============================================================================

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 10: INDEXES FOR PERFORMANCE
-- ============================================================================

-- User & Auth Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_outlets_user_id ON public.user_outlets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_outlets_outlet_id ON public.user_outlets(outlet_id);

-- Product & Inventory Indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_active ON public.inventory_items(is_active);
CREATE INDEX IF NOT EXISTS idx_outlet_inventory_outlet_id ON public.outlet_inventory(outlet_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_outlet_id ON public.inventory_transactions(outlet_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON public.inventory_transactions(created_at DESC);

-- Transaction Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_outlet_id ON public.transactions(outlet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_shift_id ON public.transactions(shift_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON public.transaction_items(transaction_id);

-- Expense Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_outlet_id ON public.expenses(outlet_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date DESC);

-- Booking Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_outlet_id ON public.bookings(outlet_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_time ON public.bookings(slot_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON public.bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);

-- HR Indexes
CREATE INDEX IF NOT EXISTS idx_employees_outlet_id ON public.employees(outlet_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee_id ON public.attendance_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee_id ON public.payroll_items(employee_id);

-- ============================================================================
-- SECTION 11: TRIGGERS & AUTO-UPDATE
-- ============================================================================

-- Function: Update timestamp on row update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_outlets_updated_at BEFORE UPDATE ON public.outlets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_expenses_updated_at BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_bookings_updated_at BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_employees_updated_at BEFORE UPDATE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_partner_vendors_updated_at BEFORE UPDATE ON public.partner_vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 12: VIEWS FOR REPORTING
-- ============================================================================

-- Booking Statistics View
CREATE OR REPLACE VIEW public.booking_stats AS
SELECT
    outlet_id,
    DATE(slot_time) as booking_date,
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
    COUNT(*) FILTER (WHERE status = 'canceled') as canceled_bookings,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_bookings,
    SUM(CASE WHEN payment_status = 'paid' THEN payment_amount ELSE 0 END) as total_revenue
FROM public.bookings
GROUP BY outlet_id, DATE(slot_time);

-- Daily Sales View
CREATE OR REPLACE VIEW public.daily_sales AS
SELECT
    outlet_id,
    DATE(created_at) as sale_date,
    COUNT(*) as transaction_count,
    SUM(total) as total_sales,
    SUM(discount) as total_discounts,
    AVG(total) as average_transaction
FROM public.transactions
GROUP BY outlet_id, DATE(created_at);

-- Low Stock Alert View
CREATE OR REPLACE VIEW public.low_stock_items AS
SELECT
    ii.id,
    ii.name,
    ii.unit,
    ii.min_stock,
    ii.current_stock,
    (ii.min_stock - ii.current_stock) as shortage,
    ii.cost_per_unit
FROM public.inventory_items ii
WHERE ii.current_stock < ii.min_stock;

-- ============================================================================
-- SECTION 13: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlet_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 14: RLS POLICIES
-- ============================================================================

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can view their own role
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can view outlets they belong to
CREATE POLICY "Users can view their outlets" ON public.outlets
    FOR SELECT USING (
        id IN (SELECT outlet_id FROM public.user_outlets WHERE user_id = auth.uid())
    );

-- Policy: Users can view data for their outlets (transactions, inventory, etc.)
CREATE POLICY "Users can view transactions for their outlets" ON public.transactions
    FOR SELECT USING (
        outlet_id IN (SELECT outlet_id FROM public.user_outlets WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create transactions for their outlets" ON public.transactions
    FOR INSERT WITH CHECK (
        outlet_id IN (SELECT outlet_id FROM public.user_outlets WHERE user_id = auth.uid())
    );

-- Policy: Bookings - users can view for their outlets
CREATE POLICY "Users can view bookings for their outlets" ON public.bookings
    FOR SELECT USING (
        outlet_id IN (SELECT outlet_id FROM public.user_outlets WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update bookings for their outlets" ON public.bookings
    FOR UPDATE USING (
        outlet_id IN (SELECT outlet_id FROM public.user_outlets WHERE user_id = auth.uid())
    );

-- Policy: Products - authenticated users can view
CREATE POLICY "Authenticated users can view products" ON public.products
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Inventory - users can view for their outlets
CREATE POLICY "Users can view inventory for their outlets" ON public.outlet_inventory
    FOR SELECT USING (
        outlet_id IN (SELECT outlet_id FROM public.user_outlets WHERE user_id = auth.uid())
    );

-- ============================================================================
-- SECTION 15: FUNCTIONS & STORED PROCEDURES
-- ============================================================================

-- Function: Get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role app_role;
BEGIN
    SELECT role INTO user_role
    FROM public.user_roles
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(user_role, 'staff'::app_role);
END;
$$;

-- Function: Check if user has role
CREATE OR REPLACE FUNCTION public.has_role(required_role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = required_role
    );
END;
$$;

-- Function: Create public booking (for customer-facing API)
CREATE OR REPLACE FUNCTION public.create_public_booking(
    p_outlet_id UUID,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_phone TEXT,
    p_slot_time TIMESTAMPTZ,
    p_payment_amount NUMERIC DEFAULT 10000.00
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id UUID;
    v_result JSON;
BEGIN
    -- Validate outlet exists
    IF NOT EXISTS (SELECT 1 FROM public.outlets WHERE id = p_outlet_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'error', 'Invalid outlet');
    END IF;

    -- Insert booking
    INSERT INTO public.bookings (
        outlet_id,
        customer_name,
        customer_email,
        customer_phone,
        slot_time,
        status,
        payment_status,
        payment_amount,
        payment_method
    ) VALUES (
        p_outlet_id,
        p_customer_name,
        p_customer_email,
        p_customer_phone,
        p_slot_time,
        'pending',
        'unpaid',
        p_payment_amount,
        'qris'
    )
    RETURNING id INTO v_booking_id;

    -- Return success
    SELECT json_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'message', 'Booking berhasil dibuat. Silakan menunggu konfirmasi.'
    ) INTO v_result;

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Function: Deduct inventory for product sale
CREATE OR REPLACE FUNCTION public.deduct_inventory_for_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    recipe RECORD;
    outlet_id_val UUID;
BEGIN
    -- Get outlet_id from transaction
    SELECT outlet_id INTO outlet_id_val
    FROM public.transactions
    WHERE id = NEW.transaction_id;

    -- Loop through recipe items for this product
    FOR recipe IN
        SELECT inventory_item_id, quantity
        FROM public.product_recipes
        WHERE product_id = NEW.product_id
    LOOP
        -- Deduct from outlet inventory
        UPDATE public.outlet_inventory
        SET quantity = quantity - (recipe.quantity * NEW.quantity)
        WHERE outlet_id = outlet_id_val
          AND inventory_item_id = recipe.inventory_item_id;

        -- Log inventory transaction
        INSERT INTO public.inventory_transactions (
            outlet_id,
            inventory_item_id,
            user_id,
            type,
            quantity,
            reference_id,
            notes
        ) VALUES (
            outlet_id_val,
            recipe.inventory_item_id,
            (SELECT user_id FROM public.transactions WHERE id = NEW.transaction_id),
            'usage',
            -(recipe.quantity * NEW.quantity),
            NEW.transaction_id,
            'Auto-deduct for sale: ' || NEW.product_name
        );
    END LOOP;

    RETURN NEW;
END;
$$;

-- Trigger: Deduct inventory on transaction item insert
CREATE TRIGGER trigger_deduct_inventory
    AFTER INSERT ON public.transaction_items
    FOR EACH ROW
    WHEN (NEW.product_id IS NOT NULL)
    EXECUTE FUNCTION public.deduct_inventory_for_sale();

-- Function: Check product availability before sale
CREATE OR REPLACE FUNCTION public.check_product_availability(
    p_product_id UUID,
    p_outlet_id UUID,
    p_quantity NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    recipe RECORD;
    available_qty NUMERIC;
BEGIN
    -- Check each ingredient in recipe
    FOR recipe IN
        SELECT inventory_item_id, quantity
        FROM public.product_recipes
        WHERE product_id = p_product_id
    LOOP
        -- Get available quantity
        SELECT quantity INTO available_qty
        FROM public.outlet_inventory
        WHERE outlet_id = p_outlet_id
          AND inventory_item_id = recipe.inventory_item_id;

        -- Check if enough stock
        IF available_qty IS NULL OR available_qty < (recipe.quantity * p_quantity) THEN
            RETURN false;
        END IF;
    END LOOP;

    RETURN true;
END;
$$;

-- ============================================================================
-- SECTION 16: GRANT PERMISSIONS
-- ============================================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_product_availability TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_inventory_for_sale TO authenticated;

-- Grant execute on public booking function to anon
GRANT EXECUTE ON FUNCTION public.create_public_booking TO anon;
GRANT EXECUTE ON FUNCTION public.create_public_booking TO authenticated;

-- ============================================================================
-- SECTION 17: SEED DATA (OPTIONAL)
-- ============================================================================

-- Insert default expense categories
INSERT INTO public.expense_categories (name, description) VALUES
    ('Operasional', 'Biaya operasional harian'),
    ('Utilities', 'Listrik, air, internet'),
    ('Supplies', 'Pembelian supplies & peralatan'),
    ('Marketing', 'Biaya promosi & marketing'),
    ('Maintenance', 'Perawatan & perbaikan'),
    ('Other', 'Lain-lain')
ON CONFLICT DO NOTHING;

-- Insert default product categories
INSERT INTO public.categories (name, description, sort_order) VALUES
    ('Haircut', 'Layanan potong rambut', 1),
    ('Styling', 'Layanan styling rambut', 2),
    ('Grooming', 'Layanan grooming lengkap', 3),
    ('Products', 'Produk perawatan rambut', 4)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VEROPRISE ERP SCHEMA SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables created: 30+';
    RAISE NOTICE 'Indexes created: 20+';
    RAISE NOTICE 'Views created: 3';
    RAISE NOTICE 'Functions created: 5';
    RAISE NOTICE 'RLS enabled on all tables';
    RAISE NOTICE '========================================';
END $$;
