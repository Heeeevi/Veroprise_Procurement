-- =====================================================
-- COMPLETE DATABASE FIX FOR BARBERDOC ERP
-- =====================================================
-- Run this in Supabase SQL Editor
-- This will fix ALL issues:
-- 1. Create outlets
-- 2. Create categories & products
-- 3. Create inventory items
-- 4. Map user to outlets
-- 5. Clean up any orphan shifts
-- =====================================================

-- ==========================================
-- STEP 1: Create Default Outlet
-- ==========================================
INSERT INTO outlets (id, name, address, phone, is_active) 
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'BarberDoc Pusat', 
  'Jl. Raya Utama No. 123, Jakarta Pusat', 
  '021-1234567', 
  true
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  is_active = true;

-- Add more outlets if needed
INSERT INTO outlets (id, name, address, phone, is_active) 
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'BarberDoc Cabang Selatan', 
  'Jl. Sudirman No. 456, Jakarta Selatan', 
  '021-7654321', 
  true
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  is_active = true;

-- ==========================================
-- STEP 2: Create Categories
-- ==========================================
INSERT INTO categories (id, name, description, sort_order) VALUES
('c0000000-0000-0000-0000-000000000001', 'Haircut', 'Layanan potong rambut', 1),
('c0000000-0000-0000-0000-000000000002', 'Styling', 'Layanan styling rambut', 2),
('c0000000-0000-0000-0000-000000000003', 'Grooming', 'Layanan grooming & beard', 3),
('c0000000-0000-0000-0000-000000000004', 'Coloring', 'Layanan pewarnaan rambut', 4),
('c0000000-0000-0000-0000-000000000005', 'Treatment', 'Layanan perawatan rambut', 5),
('c0000000-0000-0000-0000-000000000006', 'Products', 'Produk retail', 6)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- ==========================================
-- STEP 3: Create Products (Services for POS)
-- ==========================================
-- Clear existing products first to avoid duplicates
DELETE FROM transaction_items WHERE product_id IN (SELECT id FROM products);
DELETE FROM product_recipes;
DELETE FROM products;

-- Haircut Services
INSERT INTO products (category_id, name, price, cost_price, description, is_active) VALUES
('c0000000-0000-0000-0000-000000000001', 'Basic Haircut', 35000, 10000, 'Potong rambut dasar', true),
('c0000000-0000-0000-0000-000000000001', 'Executive Haircut', 100000, 30000, 'Potong rambut executive dengan konsultasi', true),
('c0000000-0000-0000-0000-000000000001', 'Kids Haircut', 25000, 8000, 'Potong rambut anak-anak', true),
('c0000000-0000-0000-0000-000000000001', 'Undercut Style', 50000, 15000, 'Gaya undercut modern', true);

-- Styling Services
INSERT INTO products (category_id, name, price, cost_price, description, is_active) VALUES
('c0000000-0000-0000-0000-000000000002', 'Hair Styling Event', 80000, 25000, 'Styling untuk acara khusus', true),
('c0000000-0000-0000-0000-000000000002', 'Pomade Styling', 40000, 12000, 'Styling dengan pomade', true),
('c0000000-0000-0000-0000-000000000002', 'Wax Styling', 45000, 15000, 'Styling dengan wax', true);

-- Grooming Services  
INSERT INTO products (category_id, name, price, cost_price, description, is_active) VALUES
('c0000000-0000-0000-0000-000000000003', 'Beard Styling', 55000, 18000, 'Styling dan trim jenggot', true),
('c0000000-0000-0000-0000-000000000003', 'Beard Trim Premium', 40000, 12000, 'Trim jenggot premium', true),
('c0000000-0000-0000-0000-000000000003', 'Beard Trim Simple', 25000, 8000, 'Trim jenggot simple', true),
('c0000000-0000-0000-0000-000000000003', 'Clean Shave', 45000, 15000, 'Cukur bersih dengan pisau', true),
('c0000000-0000-0000-0000-000000000003', 'Face Grooming', 70000, 22000, 'Grooming wajah lengkap', true),
('c0000000-0000-0000-0000-000000000003', 'Complete Grooming Package', 120000, 40000, 'Paket grooming lengkap', true);

-- Coloring Services
INSERT INTO products (category_id, name, price, cost_price, description, is_active) VALUES
('c0000000-0000-0000-0000-000000000004', 'Full Hair Color Standard', 200000, 80000, 'Pewarnaan rambut full', true),
('c0000000-0000-0000-0000-000000000004', 'Bleaching + Color', 300000, 120000, 'Bleaching dan pewarnaan', true),
('c0000000-0000-0000-0000-000000000004', 'Fantasy Color Premium', 350000, 150000, 'Pewarnaan fantasy/ombre', true),
('c0000000-0000-0000-0000-000000000004', 'Highlight Color', 250000, 100000, 'Pewarnaan highlight', true);

-- Treatment Services
INSERT INTO products (category_id, name, price, cost_price, description, is_active) VALUES
('c0000000-0000-0000-0000-000000000005', 'Hair Spa Treatment', 120000, 45000, 'Spa rambut premium', true),
('c0000000-0000-0000-0000-000000000005', 'Creambath Premium', 100000, 35000, 'Creambath premium', true),
('c0000000-0000-0000-0000-000000000005', 'Hair Tonic Growth', 95000, 40000, 'Treatment pertumbuhan rambut', true),
('c0000000-0000-0000-0000-000000000005', 'Scalp Treatment', 85000, 30000, 'Treatment kulit kepala', true);

-- Retail Products
INSERT INTO products (category_id, name, price, cost_price, description, is_active) VALUES
('c0000000-0000-0000-0000-000000000006', 'Beard Oil Premium', 120000, 60000, 'Minyak jenggot premium', true),
('c0000000-0000-0000-0000-000000000006', 'Hair Serum Shine', 90000, 45000, 'Serum rambut berkilau', true),
('c0000000-0000-0000-0000-000000000006', 'Hair Clay Matte Finish', 70000, 35000, 'Clay matte finish', true),
('c0000000-0000-0000-0000-000000000006', 'Hair Spray Strong Hold', 55000, 28000, 'Spray rambut strong', true),
('c0000000-0000-0000-0000-000000000006', 'Comb Premium Wood', 45000, 20000, 'Sisir kayu premium', true),
('c0000000-0000-0000-0000-000000000006', 'Pomade Original', 85000, 40000, 'Pomade original', true);

-- ==========================================
-- STEP 4: Create Inventory Items (Supplies)
-- ==========================================
DELETE FROM purchase_order_items WHERE inventory_item_id IN (SELECT id FROM inventory_items);
DELETE FROM outlet_inventory WHERE inventory_item_id IN (SELECT id FROM inventory_items);
DELETE FROM inventory_transactions WHERE inventory_item_id IN (SELECT id FROM inventory_items);
DELETE FROM inventory_items;

INSERT INTO inventory_items (name, unit, min_stock, cost_per_unit, current_stock, is_active) VALUES
-- Hair Products
('Pomade Supreme 100ml', 'pcs', 10, 45000, 50, true),
('Wax Professional 80ml', 'pcs', 10, 35000, 40, true),
('Hair Gel Strong 200ml', 'pcs', 8, 30000, 30, true),
('Hair Spray 250ml', 'can', 6, 38000, 25, true),
('Hair Clay 100g', 'pcs', 8, 40000, 20, true),
('Hair Serum 50ml', 'btl', 5, 55000, 15, true),
('Hair Tonic 100ml', 'btl', 12, 28000, 45, true),

-- Shampoo & Treatment
('Shampoo Anti-Dandruff 500ml', 'btl', 15, 25000, 60, true),
('Shampoo Regular 500ml', 'btl', 20, 18000, 80, true),
('Conditioner 500ml', 'btl', 15, 22000, 50, true),
('Hair Mask 250ml', 'pcs', 10, 35000, 25, true),
('Creambath Cream 500g', 'jar', 8, 45000, 20, true),

-- Beard Products  
('Beard Oil 30ml', 'btl', 5, 55000, 20, true),
('Beard Balm 50g', 'pcs', 5, 48000, 15, true),
('Aftershave Lotion 100ml', 'btl', 8, 32000, 25, true),

-- Coloring
('Hair Dye Black 100ml', 'tube', 10, 35000, 30, true),
('Hair Dye Brown 100ml', 'tube', 10, 35000, 25, true),
('Bleaching Powder 500g', 'pack', 5, 65000, 15, true),
('Developer 1000ml', 'btl', 8, 45000, 20, true),

-- Tools & Accessories
('Comb Set Professional', 'set', 5, 75000, 12, true),
('Razor Blades (pack of 10)', 'pack', 20, 25000, 50, true),
('Cape Cloth', 'pcs', 3, 85000, 10, true),
('Towel Small', 'pcs', 10, 15000, 30, true),
('Spray Bottle 500ml', 'pcs', 5, 12000, 15, true);

-- ==========================================
-- STEP 5: Create Sample Vendors
-- ==========================================
DELETE FROM partner_vendors;
INSERT INTO partner_vendors (name, contact_person, phone, email, address, notes, is_active) VALUES
('PT Supplier Kosmetik Jaya', 'Budi Santoso', '021-5551234', 'budi@kosmetikjaya.com', 'Jl. Industri No. 10, Jakarta', 'Supplier utama produk hair care', true),
('CV Barber Supply Indonesia', 'Andi Wijaya', '021-5554321', 'andi@barbersupply.id', 'Jl. Pasar Baru No. 25, Jakarta', 'Supplier alat cukur dan aksesoris', true),
('UD Maju Bersama', 'Siti Rahayu', '021-5559876', 'siti@majubersama.co.id', 'Jl. Mangga Dua No. 88, Jakarta', 'Supplier bahan kimia salon', true);

-- ==========================================
-- STEP 6: Map ALL Users to ALL Outlets
-- ==========================================
-- First, let's see what users exist
DO $$
DECLARE
  v_user_record RECORD;
  v_outlet_record RECORD;
BEGIN
  -- Loop through all users
  FOR v_user_record IN SELECT id FROM auth.users
  LOOP
    -- Loop through all outlets
    FOR v_outlet_record IN SELECT id FROM outlets WHERE is_active = true
    LOOP
      -- Insert mapping if not exists
      INSERT INTO user_outlets (user_id, outlet_id)
      VALUES (v_user_record.id, v_outlet_record.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'All users mapped to all outlets';
END $$;

-- ==========================================
-- STEP 7: Clean up orphan/invalid shifts
-- ==========================================
-- Delete any shifts that have outlet_id not in outlets table
DELETE FROM shifts 
WHERE outlet_id NOT IN (SELECT id FROM outlets);

-- Close any open shifts that are more than 24 hours old (orphan shifts)
UPDATE shifts 
SET ended_at = started_at + INTERVAL '8 hours',
    closing_cash = opening_cash,
    notes = 'Auto-closed due to system cleanup'
WHERE ended_at IS NULL 
  AND started_at < NOW() - INTERVAL '24 hours';

-- ==========================================
-- STEP 8: Set user role if not exists
-- ==========================================
DO $$
DECLARE
  v_first_user_id UUID;
BEGIN
  -- Get first user
  SELECT id INTO v_first_user_id 
  FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  IF v_first_user_id IS NOT NULL THEN
    -- Set as owner if no role exists
    INSERT INTO user_roles (user_id, role)
    VALUES (v_first_user_id, 'owner')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create profile if not exists
    INSERT INTO profiles (user_id, full_name)
    VALUES (v_first_user_id, 'Owner')
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'First user set as owner';
  END IF;
END $$;

-- ==========================================
-- STEP 9: Add unique constraints if missing
-- ==========================================
DO $$
BEGIN
  -- user_outlets unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_outlets_user_outlet_unique'
  ) THEN
    BEGIN
      ALTER TABLE user_outlets 
      ADD CONSTRAINT user_outlets_user_outlet_unique UNIQUE (user_id, outlet_id);
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- Constraint already exists
    END;
  END IF;
END $$;

-- ==========================================
-- STEP 10: Verify Results
-- ==========================================
SELECT 'VERIFICATION RESULTS' as info;
SELECT '===================' as separator;

SELECT 
  'Outlets' as table_name,
  COUNT(*) as count
FROM outlets WHERE is_active = true

UNION ALL

SELECT 
  'Categories' as table_name,
  COUNT(*) as count
FROM categories

UNION ALL

SELECT 
  'Products (Services)' as table_name,
  COUNT(*) as count
FROM products WHERE is_active = true

UNION ALL

SELECT 
  'Inventory Items' as table_name,
  COUNT(*) as count
FROM inventory_items WHERE is_active = true

UNION ALL

SELECT 
  'Vendors' as table_name,
  COUNT(*) as count
FROM partner_vendors WHERE is_active = true

UNION ALL

SELECT 
  'User-Outlet Mappings' as table_name,
  COUNT(*) as count
FROM user_outlets

UNION ALL

SELECT 
  'Active Shifts' as table_name,
  COUNT(*) as count
FROM shifts WHERE ended_at IS NULL;

-- Show outlet details
SELECT 'OUTLET DETAILS:' as info;
SELECT id, name, address, phone FROM outlets WHERE is_active = true;

-- Show user-outlet mappings
SELECT 'USER-OUTLET MAPPINGS:' as info;
SELECT 
  u.email,
  STRING_AGG(o.name, ', ') as outlets
FROM user_outlets uo
JOIN auth.users u ON u.id = uo.user_id
JOIN outlets o ON o.id = uo.outlet_id
GROUP BY u.email;
