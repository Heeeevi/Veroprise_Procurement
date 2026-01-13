-- =====================================================
-- ADD UNIQUE CONSTRAINTS FOR BETTER DATA INTEGRITY
-- =====================================================
-- Run this migration to prevent duplicate data
-- These constraints were missing from original schema
-- =====================================================

-- Add unique constraint on categories.name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'categories_name_key'
  ) THEN
    ALTER TABLE categories 
    ADD CONSTRAINT categories_name_key UNIQUE (name);
    
    RAISE NOTICE 'Added unique constraint on categories.name';
  ELSE
    RAISE NOTICE 'Unique constraint on categories.name already exists';
  END IF;
END $$;

-- Add unique constraint on user_outlets (user_id, outlet_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_outlets_user_id_outlet_id_key'
  ) THEN
    ALTER TABLE user_outlets 
    ADD CONSTRAINT user_outlets_user_id_outlet_id_key UNIQUE (user_id, outlet_id);
    
    RAISE NOTICE 'Added unique constraint on user_outlets (user_id, outlet_id)';
  ELSE
    RAISE NOTICE 'Unique constraint on user_outlets already exists';
  END IF;
END $$;

-- Add unique constraint on outlet_inventory (outlet_id, inventory_item_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'outlet_inventory_outlet_id_inventory_item_id_key'
  ) THEN
    ALTER TABLE outlet_inventory 
    ADD CONSTRAINT outlet_inventory_outlet_id_inventory_item_id_key UNIQUE (outlet_id, inventory_item_id);
    
    RAISE NOTICE 'Added unique constraint on outlet_inventory (outlet_id, inventory_item_id)';
  ELSE
    RAISE NOTICE 'Unique constraint on outlet_inventory already exists';
  END IF;
END $$;

-- Add unique constraint on product_recipes (product_id, inventory_item_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'product_recipes_product_id_inventory_item_id_key'
  ) THEN
    ALTER TABLE product_recipes 
    ADD CONSTRAINT product_recipes_product_id_inventory_item_id_key UNIQUE (product_id, inventory_item_id);
    
    RAISE NOTICE 'Added unique constraint on product_recipes (product_id, inventory_item_id)';
  ELSE
    RAISE NOTICE 'Unique constraint on product_recipes already exists';
  END IF;
END $$;

-- Verify all constraints
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname IN (
  'categories_name_key',
  'user_outlets_user_id_outlet_id_key',
  'outlet_inventory_outlet_id_inventory_item_id_key',
  'product_recipes_product_id_inventory_item_id_key'
)
ORDER BY table_name;
