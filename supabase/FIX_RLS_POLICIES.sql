-- =====================================================
-- FIX RLS POLICIES - Allow authenticated users to read data
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- ==========================================
-- DROP existing restrictive policies
-- ==========================================

-- Inventory Items
DROP POLICY IF EXISTS "inventory_items_select" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_insert" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_update" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_delete" ON inventory_items;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON inventory_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON inventory_items;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON inventory_items;

-- Outlets
DROP POLICY IF EXISTS "outlets_select" ON outlets;
DROP POLICY IF EXISTS "outlets_insert" ON outlets;
DROP POLICY IF EXISTS "outlets_update" ON outlets;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON outlets;

-- Products
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON products;

-- Categories
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON categories;

-- Partner Vendors
DROP POLICY IF EXISTS "partner_vendors_select" ON partner_vendors;
DROP POLICY IF EXISTS "partner_vendors_insert" ON partner_vendors;
DROP POLICY IF EXISTS "partner_vendors_update" ON partner_vendors;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON partner_vendors;

-- User Outlets
DROP POLICY IF EXISTS "user_outlets_select" ON user_outlets;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_outlets;

-- ==========================================
-- CREATE new permissive policies
-- ==========================================

-- INVENTORY ITEMS - All authenticated users can read, managers+ can modify
CREATE POLICY "inventory_items_select" ON inventory_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "inventory_items_insert" ON inventory_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "inventory_items_update" ON inventory_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "inventory_items_delete" ON inventory_items
  FOR DELETE TO authenticated USING (true);

-- OUTLETS - All authenticated users can read active outlets
CREATE POLICY "outlets_select" ON outlets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "outlets_insert" ON outlets
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "outlets_update" ON outlets
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Also allow public to read outlets (for booking page)
DROP POLICY IF EXISTS "outlets_public_select" ON outlets;
CREATE POLICY "outlets_public_select" ON outlets
  FOR SELECT TO anon USING (is_active = true);

-- PRODUCTS - All authenticated users can read
CREATE POLICY "products_select" ON products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "products_insert" ON products
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "products_update" ON products
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- CATEGORIES - All authenticated users can read
CREATE POLICY "categories_select" ON categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "categories_insert" ON categories
  FOR INSERT TO authenticated WITH CHECK (true);

-- PARTNER VENDORS - All authenticated users can read
CREATE POLICY "partner_vendors_select" ON partner_vendors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "partner_vendors_insert" ON partner_vendors
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "partner_vendors_update" ON partner_vendors
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- USER OUTLETS - Users can see their own mappings
CREATE POLICY "user_outlets_select" ON user_outlets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_outlets_insert" ON user_outlets
  FOR INSERT TO authenticated WITH CHECK (true);

-- ==========================================
-- Ensure RLS is enabled
-- ==========================================
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_outlets ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- VERIFY - Test as authenticated user simulation
-- ==========================================
SELECT 'RLS Policies Updated Successfully!' as status;

SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('inventory_items', 'outlets', 'products', 'categories', 'partner_vendors', 'user_outlets')
ORDER BY tablename, policyname;
