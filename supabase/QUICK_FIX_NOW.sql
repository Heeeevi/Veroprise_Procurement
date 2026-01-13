-- =====================================================
-- QUICK FIX: CREATE OUTLET & PRODUCTS IMMEDIATELY
-- =====================================================
-- Copy semua ini dan run di Supabase SQL Editor
-- =====================================================

-- 1. CREATE OUTLET
INSERT INTO outlets (name, address, phone, is_active) 
VALUES ('BarberDoc Pusat', 'Jl. Raya Utama No. 123, Jakarta Pusat', '021-1234567', true)
ON CONFLICT DO NOTHING;

-- 2. CREATE CATEGORIES (with proper check)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Haircut') THEN
    INSERT INTO categories (name, description, sort_order) VALUES ('Haircut', 'Hair cutting services', 1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Styling') THEN
    INSERT INTO categories (name, description, sort_order) VALUES ('Styling', 'Hair styling', 2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Grooming') THEN
    INSERT INTO categories (name, description, sort_order) VALUES ('Grooming', 'Beard grooming', 3);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Coloring') THEN
    INSERT INTO categories (name, description, sort_order) VALUES ('Coloring', 'Hair coloring', 4);
  END IF;
END $$;

-- 3. CREATE PRODUCTS (SERVICES) - Sesuai dengan screenshot POS
DO $$
DECLARE
  v_haircut_cat UUID;
  v_styling_cat UUID;
  v_grooming_cat UUID;
  v_coloring_cat UUID;
BEGIN
  SELECT id INTO v_haircut_cat FROM categories WHERE name = 'Haircut' LIMIT 1;
  SELECT id INTO v_styling_cat FROM categories WHERE name = 'Styling' LIMIT 1;
  SELECT id INTO v_grooming_cat FROM categories WHERE name = 'Grooming' LIMIT 1;
  SELECT id INTO v_coloring_cat FROM categories WHERE name = 'Coloring' LIMIT 1;

  -- Only insert if no products exist
  IF NOT EXISTS (SELECT 1 FROM products LIMIT 1) THEN
    -- Haircut Services (sesuai screenshot)
    INSERT INTO products (category_id, name, price, description, is_active) VALUES
    (v_haircut_cat, 'Basic Haircut', 35000, 'Potong rambut dasar', true),
    (v_haircut_cat, 'Executive Haircut', 100000, 'Potong rambut executive', true),
    
    -- Styling Services
    (v_styling_cat, 'Beard Styling', 55000, 'Styling jenggot', true),
    (v_styling_cat, 'Hair Styling Event', 80000, 'Styling untuk acara', true),
    
    -- Grooming Services (sesuai screenshot)
    (v_grooming_cat, 'Beard Oil Premium', 120000, 'Treatment jenggot premium', true),
    (v_grooming_cat, 'Beard Trim Premium', 40000, 'Trim jenggot premium', true),
    (v_grooming_cat, 'Beard Trim Simple', 25000, 'Trim jenggot simple', true),
    (v_grooming_cat, 'Clean Shave', 45000, 'Cukur bersih', true),
    (v_grooming_cat, 'Complete Grooming Package', 120000, 'Paket grooming lengkap', true),
    (v_grooming_cat, 'Comb Premium Wood', 45000, 'Sisir premium kayu', true),
    (v_grooming_cat, 'Creambath Premium', 100000, 'Creambath premium', true),
    (v_grooming_cat, 'Face Grooming', 70000, 'Grooming wajah', true),
    
    -- Coloring Services (sesuai screenshot)
    (v_coloring_cat, 'Bleaching + Color', 300000, 'Bleaching dan pewarnaan', true),
    (v_coloring_cat, 'Fantasy Color Premium', 350000, 'Pewarnaan fantasy', true),
    (v_coloring_cat, 'Full Hair Color Standard', 200000, 'Pewarnaan full standard', true),
    (v_coloring_cat, 'Hair Clay Matte Finish', 70000, 'Clay matte finish', true),
    (v_coloring_cat, 'Hair Serum Shine', 90000, 'Serum rambut shine', true),
    (v_coloring_cat, 'Hair Spa Treatment', 120000, 'Treatment spa rambut', true),
    (v_coloring_cat, 'Hair Spray Strong Hold', 55000, 'Hair spray strong', true),
    (v_coloring_cat, 'Hair Tonic Growth', 95000, 'Tonic pertumbuhan', true);
  END IF;
END $$;

-- 4. MAP USER TO OUTLET (CRITICAL!)
DO $$
DECLARE
  v_user_id UUID;
  v_outlet_id UUID;
BEGIN
  -- Get YOUR user ID (first user = master)
  SELECT id INTO v_user_id 
  FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- Get outlet ID
  SELECT id INTO v_outlet_id 
  FROM outlets 
  WHERE is_active = true 
  LIMIT 1;
  
  IF v_user_id IS NOT NULL AND v_outlet_id IS NOT NULL THEN
    -- Map user to outlet (check if exists first)
    IF NOT EXISTS (
      SELECT 1 FROM user_outlets 
      WHERE user_id = v_user_id AND outlet_id = v_outlet_id
    ) THEN
      INSERT INTO user_outlets (user_id, outlet_id)
      VALUES (v_user_id, v_outlet_id);
      
      RAISE NOTICE 'User mapped to outlet successfully';
    ELSE
      RAISE NOTICE 'User already mapped to outlet';
    END IF;
  ELSE
    RAISE NOTICE 'User or outlet not found!';
  END IF;
END $$;

-- 5. OPTIONAL: Create sample inventory items (supplies)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM inventory_items LIMIT 1) THEN
    INSERT INTO inventory_items (name, unit, min_stock, cost_per_unit, current_stock, is_active) VALUES
    ('Pomade Supreme', 'pcs', 10, 45000, 50, true),
    ('Wax Professional', 'pcs', 10, 35000, 40, true),
    ('Shampoo Anti-Dandruff', 'btl', 15, 25000, 60, true),
    ('Hair Gel Strong Hold', 'pcs', 8, 30000, 30, true),
    ('Beard Oil Premium', 'btl', 5, 55000, 20, true),
    ('Hair Tonic Herbal', 'btl', 12, 28000, 45, true),
    ('Aftershave Lotion', 'btl', 8, 32000, 25, true),
    ('Styling Cream', 'pcs', 10, 40000, 35, true),
    ('Hair Spray Ultra Hold', 'can', 6, 38000, 18, true),
    ('Comb Set Professional', 'set', 5, 75000, 12, true);
    
    RAISE NOTICE 'Inventory items created';
  END IF;
END $$;

-- 6. VERIFY RESULTS
SELECT 
  'Outlets' as table_name,
  COUNT(*) as count,
  STRING_AGG(name, ', ') as items
FROM outlets
WHERE is_active = true

UNION ALL

SELECT 
  'Products (Services)' as table_name,
  COUNT(*) as count,
  STRING_AGG(name, ', ' ORDER BY name LIMIT 5) || ' ...' as items
FROM products
WHERE is_active = true

UNION ALL

SELECT 
  'Inventory Items' as table_name,
  COUNT(*) as count,
  STRING_AGG(name, ', ' ORDER BY name LIMIT 5) || ' ...' as items
FROM inventory_items
WHERE is_active = true

UNION ALL

SELECT 
  'User-Outlet Mappings' as table_name,
  COUNT(*) as count,
  STRING_AGG(u.email, ', ') as items
FROM user_outlets uo
JOIN auth.users u ON u.id = uo.user_id;
