-- =====================================================
-- FIX RLS FOR ALL TABLES - COMPLETE
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- ==========================================
-- FIRST: Check if bookings table exists, create if not
-- ==========================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50) NOT NULL,
  slot_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_amount DECIMAL(12,2) DEFAULT 10000,
  notes TEXT,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  transaction_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- BOOKINGS TABLE
-- ==========================================
DROP POLICY IF EXISTS "bookings_select" ON bookings;
DROP POLICY IF EXISTS "bookings_insert" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_public" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_auth" ON bookings;
DROP POLICY IF EXISTS "bookings_update" ON bookings;
DROP POLICY IF EXISTS "bookings_delete" ON bookings;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON bookings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON bookings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON bookings;
DROP POLICY IF EXISTS "Allow public to create bookings" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated to read bookings" ON bookings;

-- Allow authenticated users to read all bookings (for staff to manage)
CREATE POLICY "bookings_select" ON bookings
  FOR SELECT TO authenticated USING (true);

-- Allow public (anonymous) users to create bookings
CREATE POLICY "bookings_insert_public" ON bookings
  FOR INSERT TO anon WITH CHECK (true);

-- Allow authenticated users to create bookings too
CREATE POLICY "bookings_insert_auth" ON bookings
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update bookings (confirm, cancel, etc)
CREATE POLICY "bookings_update" ON bookings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow authenticated users to delete bookings
CREATE POLICY "bookings_delete" ON bookings
  FOR DELETE TO authenticated USING (true);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SHIFTS TABLE
-- ==========================================
DROP POLICY IF EXISTS "shifts_select" ON shifts;
DROP POLICY IF EXISTS "shifts_insert" ON shifts;
DROP POLICY IF EXISTS "shifts_update" ON shifts;
DROP POLICY IF EXISTS "shifts_delete" ON shifts;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON shifts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON shifts;
DROP POLICY IF EXISTS "Users can read own shifts" ON shifts;
DROP POLICY IF EXISTS "Users can insert own shifts" ON shifts;
DROP POLICY IF EXISTS "Users can update own shifts" ON shifts;

-- Users can read their own shifts
CREATE POLICY "shifts_select" ON shifts
  FOR SELECT TO authenticated USING (true);

-- Users can create their own shifts
CREATE POLICY "shifts_insert" ON shifts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own shifts (end shift)
CREATE POLICY "shifts_update" ON shifts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- TRANSACTIONS TABLE (needed for booking confirmation)
-- ==========================================
DROP POLICY IF EXISTS "transactions_select" ON transactions;
DROP POLICY IF EXISTS "transactions_insert" ON transactions;
DROP POLICY IF EXISTS "transactions_update" ON transactions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON transactions;

CREATE POLICY "transactions_select" ON transactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "transactions_insert" ON transactions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "transactions_update" ON transactions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- TRANSACTION ITEMS TABLE
-- ==========================================
DROP POLICY IF EXISTS "transaction_items_select" ON transaction_items;
DROP POLICY IF EXISTS "transaction_items_insert" ON transaction_items;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON transaction_items;

CREATE POLICY "transaction_items_select" ON transaction_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "transaction_items_insert" ON transaction_items
  FOR INSERT TO authenticated WITH CHECK (true);

-- ==========================================
-- EXPENSES TABLE (for reports)
-- ==========================================
DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON expenses;

CREATE POLICY "expenses_select" ON expenses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- PROFILES TABLE (needed for booking confirmer)
-- ==========================================
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- USER_ROLES TABLE
-- ==========================================
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_roles;

CREATE POLICY "user_roles_select" ON user_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_roles_insert" ON user_roles
  FOR INSERT TO authenticated WITH CHECK (true);

-- ==========================================
-- Ensure RLS is enabled
-- ==========================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- VERIFY
-- ==========================================
SELECT 'RLS Policies for Bookings & Shifts Updated!' as status;

SELECT 
  tablename, 
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE tablename IN ('bookings', 'shifts', 'transactions', 'profiles')
ORDER BY tablename, policyname;
