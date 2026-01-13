-- =====================================================
-- SIMPLE DATABASE FIX - Run this in Supabase SQL Editor
-- =====================================================
-- Bypass RLS for admin operations
-- =====================================================

-- First, disable RLS temporarily on these tables for seeding
ALTER TABLE outlets DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE partner_vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_outlets DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 1: Create Outlets
-- ==========================================
INSERT INTO outlets (id, name, address, phone, is_active) 
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'BarberDoc Pusat', 'Jl. Raya Utama No. 123, Jakarta Pusat', '021-1234567', true),
  ('a0000000-0000-0000-0000-000000000002', 'BarberDoc Cabang Selatan', 'Jl. Sudirman No. 456, Jakarta Selatan', '021-7654321', true)
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
  ('c0000000-0000-0000-0000-000000000004', 'Coloring', 'Pewarnaan rambut', 4),
  ('c0000000-0000-0000-0000-000000000005', 'Treatment', 'Perawatan rambut', 5),
  ('c0000000-0000-0000-0000-000000000006', 'Products', 'Produk retail', 6)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- ==========================================
-- STEP 3: Create Products (Services for POS)
-- ==========================================
INSERT INTO products (category_id, name, price, cost_price, description, is_active) VALUES
  -- Haircut
  ('c0000000-0000-0000-0000-000000000001', 'Basic Haircut', 35000, 10000, 'Potong rambut dasar', true),
  ('c0000000-0000-0000-0000-000000000001', 'Executive Haircut', 100000, 30000, 'Potong rambut executive', true),
  ('c0000000-0000-0000-0000-000000000001', 'Kids Haircut', 25000, 8000, 'Potong rambut anak-anak', true),
  ('c0000000-0000-0000-0000-000000000001', 'Undercut Style', 50000, 15000, 'Gaya undercut modern', true),
  -- Styling
  ('c0000000-0000-0000-0000-000000000002', 'Hair Styling', 80000, 25000, 'Styling untuk acara', true),
  ('c0000000-0000-0000-0000-000000000002', 'Pomade Styling', 40000, 12000, 'Styling dengan pomade', true),
  -- Grooming
  ('c0000000-0000-0000-0000-000000000003', 'Beard Trim', 40000, 12000, 'Trim jenggot', true),
  ('c0000000-0000-0000-0000-000000000003', 'Clean Shave', 45000, 15000, 'Cukur bersih', true),
  ('c0000000-0000-0000-0000-000000000003', 'Face Grooming', 70000, 22000, 'Grooming wajah', true),
  -- Coloring
  ('c0000000-0000-0000-0000-000000000004', 'Hair Color', 200000, 80000, 'Pewarnaan rambut', true),
  ('c0000000-0000-0000-0000-000000000004', 'Bleaching', 300000, 120000, 'Bleaching rambut', true),
  -- Treatment
  ('c0000000-0000-0000-0000-000000000005', 'Hair Spa', 120000, 45000, 'Spa rambut premium', true),
  ('c0000000-0000-0000-0000-000000000005', 'Creambath', 100000, 35000, 'Creambath premium', true),
  -- Products
  ('c0000000-0000-0000-0000-000000000006', 'Pomade', 85000, 40000, 'Pomade original', true),
  ('c0000000-0000-0000-0000-000000000006', 'Hair Wax', 70000, 35000, 'Hair wax', true),
  ('c0000000-0000-0000-0000-000000000006', 'Beard Oil', 120000, 60000, 'Minyak jenggot', true)
ON CONFLICT DO NOTHING;

-- ==========================================
-- STEP 4: Create Inventory Items
-- ==========================================
INSERT INTO inventory_items (name, unit, min_stock, cost_per_unit, current_stock, is_active) VALUES
  ('Pomade Supreme 100ml', 'pcs', 10, 45000, 50, true),
  ('Hair Wax 80ml', 'pcs', 10, 35000, 40, true),
  ('Hair Gel 200ml', 'pcs', 8, 30000, 30, true),
  ('Hair Spray 250ml', 'can', 6, 38000, 25, true),
  ('Shampoo 500ml', 'btl', 15, 25000, 60, true),
  ('Conditioner 500ml', 'btl', 15, 22000, 50, true),
  ('Beard Oil 30ml', 'btl', 5, 55000, 20, true),
  ('Aftershave 100ml', 'btl', 8, 32000, 25, true),
  ('Hair Dye Black', 'tube', 10, 35000, 30, true),
  ('Hair Dye Brown', 'tube', 10, 35000, 25, true),
  ('Bleaching Powder', 'pack', 5, 65000, 15, true),
  ('Developer 1000ml', 'btl', 8, 45000, 20, true),
  ('Razor Blades (10pcs)', 'pack', 20, 25000, 50, true),
  ('Towel Small', 'pcs', 10, 15000, 30, true),
  ('Cape Cloth', 'pcs', 3, 85000, 10, true)
ON CONFLICT DO NOTHING;

-- ==========================================
-- STEP 5: Create Vendors
-- ==========================================
INSERT INTO partner_vendors (name, contact_person, phone, email, address, is_active) VALUES
  ('PT Supplier Kosmetik', 'Budi Santoso', '021-5551234', 'budi@kosmetik.com', 'Jakarta Pusat', true),
  ('CV Barber Supply', 'Andi Wijaya', '021-5554321', 'andi@barbersupply.id', 'Jakarta Barat', true),
  ('UD Maju Bersama', 'Siti Rahayu', '021-5559876', 'siti@majubersama.co.id', 'Jakarta Timur', true)
ON CONFLICT DO NOTHING;

-- ==========================================
-- STEP 6: Map Users to Outlets
-- ==========================================
INSERT INTO user_outlets (user_id, outlet_id)
SELECT u.id, o.id
FROM auth.users u
CROSS JOIN outlets o
WHERE o.is_active = true
ON CONFLICT DO NOTHING;

-- ==========================================
-- STEP 7: Re-enable RLS
-- ==========================================
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_outlets ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- VERIFY
-- ==========================================
SELECT 'Outlets' as tabel, COUNT(*) as jumlah FROM outlets WHERE is_active = true
UNION ALL SELECT 'Categories', COUNT(*) FROM categories
UNION ALL SELECT 'Products', COUNT(*) FROM products WHERE is_active = true
UNION ALL SELECT 'Inventory', COUNT(*) FROM inventory_items WHERE is_active = true
UNION ALL SELECT 'Vendors', COUNT(*) FROM partner_vendors WHERE is_active = true
UNION ALL SELECT 'User-Outlets', COUNT(*) FROM user_outlets;
