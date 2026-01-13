-- =====================================================
-- WIPE ALL DATA AND SEED FRESH DATA
-- =====================================================
-- Run this in Supabase SQL Editor
-- This will DELETE all data EXCEPT users (auth.users)
-- =====================================================

-- ==========================================
-- STEP 1: DELETE ALL DATA (in correct order due to FK)
-- ==========================================

-- Delete dependent tables first
DELETE FROM payroll_items;
DELETE FROM payroll_runs;
DELETE FROM attendance_logs;
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;
DELETE FROM transaction_items;
DELETE FROM transactions;
DELETE FROM bookings;
DELETE FROM shifts;
DELETE FROM expenses;
DELETE FROM product_recipes;
DELETE FROM inventory_transactions;
DELETE FROM outlet_inventory;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM inventory_items;
DELETE FROM employees;
DELETE FROM user_outlets;
DELETE FROM user_roles;
DELETE FROM profiles;
DELETE FROM partner_vendors;
DELETE FROM expense_categories;
DELETE FROM outlets;
DELETE FROM audit_logs;

-- ==========================================
-- STEP 2: CREATE OUTLETS
-- ==========================================
INSERT INTO outlets (id, name, address, phone, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'BarberDoc Pusat', 'Jl. Sudirman No. 123, Jakarta Pusat', '021-5551234', true),
  ('22222222-2222-2222-2222-222222222222', 'BarberDoc Cabang Selatan', 'Jl. Gatot Subroto No. 456, Jakarta Selatan', '021-5554321', true);

-- ==========================================
-- STEP 3: CREATE CATEGORIES (Product/Service)
-- ==========================================
INSERT INTO categories (id, name, description, sort_order) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Haircut', 'Layanan potong rambut', 1),
  ('c2222222-2222-2222-2222-222222222222', 'Styling', 'Layanan styling rambut', 2),
  ('c3333333-3333-3333-3333-333333333333', 'Grooming', 'Layanan cukur & grooming', 3),
  ('c4444444-4444-4444-4444-444444444444', 'Coloring', 'Layanan pewarnaan rambut', 4),
  ('c5555555-5555-5555-5555-555555555555', 'Treatment', 'Layanan perawatan rambut', 5),
  ('c6666666-6666-6666-6666-666666666666', 'Products', 'Produk retail', 6);

-- ==========================================
-- STEP 4: CREATE PRODUCTS (Services)
-- ==========================================
INSERT INTO products (category_id, name, price, cost_price, description, is_active) VALUES
  -- Haircut
  ('c1111111-1111-1111-1111-111111111111', 'Basic Haircut', 35000, 10000, 'Potong rambut standar', true),
  ('c1111111-1111-1111-1111-111111111111', 'Executive Cut', 75000, 25000, 'Potong rambut premium dengan konsultasi', true),
  ('c1111111-1111-1111-1111-111111111111', 'Kids Haircut', 25000, 8000, 'Potong rambut anak-anak', true),
  ('c1111111-1111-1111-1111-111111111111', 'Undercut', 50000, 15000, 'Gaya undercut modern', true),
  -- Styling
  ('c2222222-2222-2222-2222-222222222222', 'Hair Styling', 40000, 12000, 'Styling dengan pomade/wax', true),
  ('c2222222-2222-2222-2222-222222222222', 'Event Styling', 80000, 25000, 'Styling untuk acara khusus', true),
  -- Grooming
  ('c3333333-3333-3333-3333-333333333333', 'Beard Trim', 30000, 10000, 'Rapikan jenggot', true),
  ('c3333333-3333-3333-3333-333333333333', 'Clean Shave', 35000, 12000, 'Cukur bersih dengan pisau', true),
  ('c3333333-3333-3333-3333-333333333333', 'Face Treatment', 50000, 18000, 'Grooming wajah lengkap', true),
  -- Coloring
  ('c4444444-4444-4444-4444-444444444444', 'Hair Color', 150000, 60000, 'Pewarnaan rambut standar', true),
  ('c4444444-4444-4444-4444-444444444444', 'Bleaching', 200000, 80000, 'Bleaching rambut', true),
  ('c4444444-4444-4444-4444-444444444444', 'Highlight', 180000, 70000, 'Highlight rambut', true),
  -- Treatment
  ('c5555555-5555-5555-5555-555555555555', 'Hair Spa', 100000, 40000, 'Spa rambut premium', true),
  ('c5555555-5555-5555-5555-555555555555', 'Creambath', 80000, 30000, 'Creambath relaksasi', true),
  ('c5555555-5555-5555-5555-555555555555', 'Scalp Treatment', 70000, 28000, 'Perawatan kulit kepala', true),
  -- Retail Products
  ('c6666666-6666-6666-6666-666666666666', 'Pomade', 85000, 45000, 'Pomade premium', true),
  ('c6666666-6666-6666-6666-666666666666', 'Hair Wax', 75000, 40000, 'Hair wax matte', true),
  ('c6666666-6666-6666-6666-666666666666', 'Beard Oil', 95000, 50000, 'Minyak jenggot', true);

-- ==========================================
-- STEP 5: CREATE INVENTORY ITEMS (Supplies)
-- ==========================================
INSERT INTO inventory_items (name, unit, min_stock, current_stock, cost_per_unit, is_active) VALUES
  ('Pomade Supreme 100ml', 'pcs', 10, 50, 45000, true),
  ('Hair Wax 80ml', 'pcs', 10, 40, 35000, true),
  ('Hair Gel 200ml', 'pcs', 8, 30, 25000, true),
  ('Shampoo 500ml', 'btl', 15, 60, 20000, true),
  ('Conditioner 500ml', 'btl', 10, 40, 22000, true),
  ('Beard Oil 30ml', 'btl', 5, 25, 50000, true),
  ('Aftershave 100ml', 'btl', 8, 30, 30000, true),
  ('Hair Dye Black', 'tube', 10, 35, 35000, true),
  ('Hair Dye Brown', 'tube', 10, 30, 35000, true),
  ('Bleaching Powder', 'pack', 5, 20, 60000, true),
  ('Developer 1L', 'btl', 5, 15, 45000, true),
  ('Razor Blades (10pc)', 'pack', 20, 100, 20000, true),
  ('Towel', 'pcs', 10, 50, 15000, true),
  ('Cape Cloth', 'pcs', 5, 15, 80000, true);

-- ==========================================
-- STEP 6: CREATE EXPENSE CATEGORIES
-- ==========================================
INSERT INTO expense_categories (name, description) VALUES
  ('Operasional', 'Biaya operasional harian'),
  ('Supplies', 'Pembelian supplies'),
  ('Utilities', 'Listrik, air, internet'),
  ('Marketing', 'Biaya promosi & marketing'),
  ('Maintenance', 'Perawatan & perbaikan');

-- ==========================================
-- STEP 7: CREATE VENDORS
-- ==========================================
INSERT INTO partner_vendors (name, contact_person, phone, email, address, is_active) VALUES
  ('PT Supplier Kosmetik Jaya', 'Budi Santoso', '021-5551111', 'budi@kosmetikjaya.com', 'Jl. Industri No. 10, Jakarta', true),
  ('CV Barber Supply Indonesia', 'Andi Wijaya', '021-5552222', 'andi@barbersupply.id', 'Jl. Pasar Baru No. 25, Jakarta', true),
  ('UD Maju Bersama', 'Siti Rahayu', '021-5553333', 'siti@majubersama.co.id', 'Jl. Mangga Dua No. 88, Jakarta', true);

-- ==========================================
-- STEP 8: MAP ALL USERS TO ALL OUTLETS
-- ==========================================
INSERT INTO user_outlets (user_id, outlet_id)
SELECT u.id, o.id
FROM auth.users u
CROSS JOIN outlets o
WHERE o.is_active = true
ON CONFLICT DO NOTHING;

-- ==========================================
-- STEP 9: SET USER ROLES
-- ==========================================
-- Set first user as owner
INSERT INTO user_roles (user_id, role)
SELECT id, 'owner'
FROM auth.users
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (user_id) DO UPDATE SET role = 'owner';

-- ==========================================
-- STEP 10: CREATE PROFILES FOR USERS
-- ==========================================
INSERT INTO profiles (user_id, full_name)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ==========================================
-- STEP 11: FIX RLS POLICIES
-- ==========================================
-- Drop and recreate all policies

-- OUTLETS
DROP POLICY IF EXISTS "outlets_select" ON outlets;
DROP POLICY IF EXISTS "outlets_public_select" ON outlets;
CREATE POLICY "outlets_select" ON outlets FOR SELECT TO authenticated USING (true);
CREATE POLICY "outlets_public_select" ON outlets FOR SELECT TO anon USING (is_active = true);

-- CATEGORIES
DROP POLICY IF EXISTS "categories_select" ON categories;
CREATE POLICY "categories_select" ON categories FOR SELECT TO authenticated USING (true);

-- PRODUCTS
DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products FOR SELECT TO authenticated USING (true);

-- INVENTORY_ITEMS
DROP POLICY IF EXISTS "inventory_items_select" ON inventory_items;
CREATE POLICY "inventory_items_select" ON inventory_items FOR SELECT TO authenticated USING (true);

-- PARTNER_VENDORS
DROP POLICY IF EXISTS "partner_vendors_select" ON partner_vendors;
DROP POLICY IF EXISTS "partner_vendors_insert" ON partner_vendors;
DROP POLICY IF EXISTS "partner_vendors_update" ON partner_vendors;
CREATE POLICY "partner_vendors_select" ON partner_vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "partner_vendors_insert" ON partner_vendors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "partner_vendors_update" ON partner_vendors FOR UPDATE TO authenticated USING (true);

-- USER_OUTLETS
DROP POLICY IF EXISTS "user_outlets_select" ON user_outlets;
CREATE POLICY "user_outlets_select" ON user_outlets FOR SELECT TO authenticated USING (true);

-- USER_ROLES
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
CREATE POLICY "user_roles_select" ON user_roles FOR SELECT TO authenticated USING (true);

-- PROFILES
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- SHIFTS
DROP POLICY IF EXISTS "shifts_select" ON shifts;
DROP POLICY IF EXISTS "shifts_insert" ON shifts;
DROP POLICY IF EXISTS "shifts_update" ON shifts;
CREATE POLICY "shifts_select" ON shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "shifts_insert" ON shifts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shifts_update" ON shifts FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- TRANSACTIONS
DROP POLICY IF EXISTS "transactions_select" ON transactions;
DROP POLICY IF EXISTS "transactions_insert" ON transactions;
CREATE POLICY "transactions_select" ON transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT TO authenticated WITH CHECK (true);

-- TRANSACTION_ITEMS
DROP POLICY IF EXISTS "transaction_items_select" ON transaction_items;
DROP POLICY IF EXISTS "transaction_items_insert" ON transaction_items;
CREATE POLICY "transaction_items_select" ON transaction_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "transaction_items_insert" ON transaction_items FOR INSERT TO authenticated WITH CHECK (true);

-- BOOKINGS
DROP POLICY IF EXISTS "bookings_select" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_public" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_auth" ON bookings;
DROP POLICY IF EXISTS "bookings_update" ON bookings;
CREATE POLICY "bookings_select" ON bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "bookings_insert_public" ON bookings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "bookings_insert_auth" ON bookings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bookings_update" ON bookings FOR UPDATE TO authenticated USING (true);

-- EXPENSES
DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated USING (true);

-- EXPENSE_CATEGORIES
DROP POLICY IF EXISTS "expense_categories_select" ON expense_categories;
CREATE POLICY "expense_categories_select" ON expense_categories FOR SELECT TO authenticated USING (true);

-- Enable RLS
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- VERIFICATION
-- ==========================================
SELECT '✅ DATA WIPE & SEED COMPLETE!' as status;

SELECT 
  'Outlets' as table_name, COUNT(*) as count FROM outlets
UNION ALL SELECT 'Categories', COUNT(*) FROM categories
UNION ALL SELECT 'Products', COUNT(*) FROM products WHERE is_active = true
UNION ALL SELECT 'Inventory Items', COUNT(*) FROM inventory_items WHERE is_active = true
UNION ALL SELECT 'Expense Categories', COUNT(*) FROM expense_categories
UNION ALL SELECT 'Vendors', COUNT(*) FROM partner_vendors WHERE is_active = true
UNION ALL SELECT 'User Outlets', COUNT(*) FROM user_outlets
UNION ALL SELECT 'User Roles', COUNT(*) FROM user_roles
UNION ALL SELECT 'Profiles', COUNT(*) FROM profiles;
