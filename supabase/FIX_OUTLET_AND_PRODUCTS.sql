-- =====================================================
-- FIX OUTLET AND PRODUCTS SYNCHRONIZATION
-- =====================================================
-- Purpose: 
-- 1. Ensure outlets are created and visible
-- 2. Sync products table with inventory_items
-- 3. Fix POS showing products that don't exist in inventory
--
-- Run this after COMPLETE_SCHEMA.sql
-- =====================================================

-- ==========================================
-- STEP 1: CREATE DEFAULT OUTLET IF MISSING
-- ==========================================
-- Check if outlets table is empty, create default outlet
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM outlets WHERE is_active = true LIMIT 1) THEN
    INSERT INTO outlets (name, address, phone, is_active) VALUES
    ('BarberDoc Pusat', 'Jl. Raya Utama No. 123, Jakarta Pusat', '021-1234567', true);
    
    RAISE NOTICE 'Default outlet created successfully';
  ELSE
    RAISE NOTICE 'Outlets already exist, skipping';
  END IF;
END $$;

-- ==========================================
-- STEP 2: SYNC PRODUCTS WITH INVENTORY
-- ==========================================
-- Products table should match inventory_items
-- POS uses "products" table, but inventory uses "inventory_items"
-- We need to keep them synchronized

-- Option A: If you want products to be SERVICES (haircut, styling, etc)
-- and inventory_items to be SUPPLIES (pomade, shampoo, etc)
-- Then keep them separate - this is the recommended approach

-- Option B: If you want unified product catalog
-- (uncomment below to sync inventory_items into products)

/*
-- Clear existing products
TRUNCATE TABLE products CASCADE;

-- Copy all inventory items into products as services
INSERT INTO products (
  name,
  category_id,
  price,
  description,
  is_active,
  created_at,
  updated_at
)
SELECT 
  ii.name,
  c.id, -- Map to corresponding category
  ii.cost_per_unit * 5, -- Markup price (cost * 5 for example)
  'Service using ' || ii.name,
  ii.is_active,
  ii.created_at,
  ii.updated_at
FROM inventory_items ii
LEFT JOIN categories c ON c.name = 'Services' -- Adjust category mapping
WHERE ii.is_active = true;
*/

-- ==========================================
-- STEP 3: CREATE CATEGORIES IF MISSING
-- ==========================================
-- Ensure essential categories exist
DO $$
BEGIN
  -- Insert categories only if they don't exist
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Haircut') THEN
    INSERT INTO categories (name, description, sort_order) VALUES ('Haircut', 'Hair cutting and styling services', 1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Styling') THEN
    INSERT INTO categories (name, description, sort_order) VALUES ('Styling', 'Hair styling and grooming', 2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Grooming') THEN
    INSERT INTO categories (name, description, sort_order) VALUES ('Grooming', 'Beard and facial grooming', 3);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Coloring') THEN
    INSERT INTO categories (name, description, sort_order) VALUES ('Coloring', 'Hair coloring services', 4);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Treatments') THEN
    INSERT INTO categories (name, description, sort_order) VALUES ('Treatments', 'Hair and scalp treatments', 5);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Products') THEN
    INSERT INTO categories (name, description, sort_order) VALUES ('Products', 'Retail products and supplies', 6);
  END IF;
  
  RAISE NOTICE 'Categories check completed';
END $$;

-- ==========================================
-- STEP 4: CREATE SAMPLE PRODUCTS (SERVICES)
-- ==========================================
-- These are SERVICE products for POS (not inventory items)
-- Customer pays for these services at checkout

DO $$
DECLARE
  v_haircut_cat_id UUID;
  v_styling_cat_id UUID;
  v_grooming_cat_id UUID;
  v_coloring_cat_id UUID;
BEGIN
  -- Get category IDs
  SELECT id INTO v_haircut_cat_id FROM categories WHERE name = 'Haircut' LIMIT 1;
  SELECT id INTO v_styling_cat_id FROM categories WHERE name = 'Styling' LIMIT 1;
  SELECT id INTO v_grooming_cat_id FROM categories WHERE name = 'Grooming' LIMIT 1;
  SELECT id INTO v_coloring_cat_id FROM categories WHERE name = 'Coloring' LIMIT 1;

  -- Insert service products if none exist
  IF NOT EXISTS (SELECT 1 FROM products LIMIT 1) THEN
    -- Haircut Services
    INSERT INTO products (category_id, name, price, description, is_active) VALUES
    (v_haircut_cat_id, 'Potong Rambut Reguler', 50000, 'Potong rambut standar untuk pria', true),
    (v_haircut_cat_id, 'Potong Rambut Premium', 75000, 'Potong rambut dengan konsultasi styling', true),
    (v_haircut_cat_id, 'Potong Rambut Anak', 35000, 'Potong rambut untuk anak-anak', true),
    
    -- Styling Services
    (v_styling_cat_id, 'Styling Klasik', 40000, 'Styling rambut dengan pomade/wax', true),
    (v_styling_cat_id, 'Styling Modern', 60000, 'Styling rambut dengan teknik modern', true),
    
    -- Grooming Services
    (v_grooming_cat_id, 'Cukur Jenggot', 30000, 'Cukur jenggot dan kumis rapi', true),
    (v_grooming_cat_id, 'Grooming Lengkap', 80000, 'Potong rambut + cukur jenggot + styling', true),
    (v_grooming_cat_id, 'Facial Treatment', 100000, 'Perawatan wajah untuk pria', true),
    
    -- Coloring Services
    (v_coloring_cat_id, 'Cat Rambut Full', 200000, 'Pewarnaan rambut seluruh kepala', true),
    (v_coloring_cat_id, 'Cat Rambut Highlight', 150000, 'Pewarnaan highlight/ombre', true);
    
    RAISE NOTICE 'Service products created successfully';
  ELSE
    RAISE NOTICE 'Products already exist, skipping';
  END IF;
END $$;

-- ==========================================
-- STEP 5: MAP USER TO OUTLETS
-- ==========================================
-- Ensure the first user (master account) is mapped to all outlets
DO $$
DECLARE
  v_first_user_id UUID;
  v_outlet_id UUID;
BEGIN
  -- Get the first user (owner/master account)
  SELECT id INTO v_first_user_id 
  FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF v_first_user_id IS NOT NULL THEN
    -- Map user to all outlets
    FOR v_outlet_id IN SELECT id FROM outlets WHERE is_active = true
    LOOP
      -- Check if mapping already exists
      IF NOT EXISTS (
        SELECT 1 FROM user_outlets 
        WHERE user_id = v_first_user_id AND outlet_id = v_outlet_id
      ) THEN
        INSERT INTO user_outlets (user_id, outlet_id)
        VALUES (v_first_user_id, v_outlet_id);
      END IF;
    END LOOP;
    
    RAISE NOTICE 'User mapped to outlets successfully';
  ELSE
    RAISE NOTICE 'No users found, please signup first';
  END IF;
END $$;

-- ==========================================
-- STEP 6: VERIFY SETUP
-- ==========================================
SELECT 
  'Outlets' as table_name,
  COUNT(*) as record_count
FROM outlets
WHERE is_active = true

UNION ALL

SELECT 
  'Products (Services)' as table_name,
  COUNT(*) as record_count
FROM products
WHERE is_active = true

UNION ALL

SELECT 
  'Inventory Items (Supplies)' as table_name,
  COUNT(*) as record_count
FROM inventory_items
WHERE is_active = true

UNION ALL

SELECT 
  'User-Outlet Mappings' as table_name,
  COUNT(*) as record_count
FROM user_outlets;

-- ==========================================
-- EXPLANATION OF DATA MODEL
-- ==========================================
/*
PRODUCTS vs INVENTORY_ITEMS:

1. PRODUCTS = SERVICES that customers buy
   - Haircut services (Potong Rambut Reguler, Premium, etc)
   - Styling services (Styling Klasik, Modern)
   - Grooming services (Cukur Jenggot, Facial)
   - Used in POS for selling services
   - Price = what customer pays
   
2. INVENTORY_ITEMS = SUPPLIES used to provide services
   - Pomade (inventory consumed when doing styling)
   - Shampoo (inventory consumed when washing hair)
   - Wax, gel, tools, etc
   - Used in Inventory page for stock management
   - Cost = what we paid to buy supplies
   
3. PRODUCT_RECIPES = Link between products and inventory
   - When selling "Styling Modern" service:
     * Deduct 0.1 unit of Pomade from inventory
     * Deduct 0.05 unit of Wax from inventory
   - Automatic inventory deduction when POS transaction completes
   
RECOMMENDED APPROACH:
- Keep products (services) and inventory_items (supplies) separate
- Use product_recipes to link them
- POS sells services (products table)
- Inventory tracks supplies (inventory_items table)
- Recipes auto-deduct supplies when services sold
*/

-- ==========================================
-- CLEANUP (Optional - only if you want fresh start)
-- ==========================================
/*
-- Uncomment below to delete all test data and start fresh

DELETE FROM bookings;
DELETE FROM transaction_items;
DELETE FROM transactions;
DELETE FROM inventory_batches;
DELETE FROM product_recipes;
DELETE FROM products;
DELETE FROM inventory_items;
DELETE FROM categories;
DELETE FROM user_outlets;
DELETE FROM outlets WHERE name LIKE '%Test%' OR name LIKE '%Sample%';

-- Then re-run steps 3-5 above
*/
