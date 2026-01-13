-- Migration: Create Product Recipes Table
-- Links products to inventory items for stock deduction on sale

-- Create product_recipes table (Recipe-based: 1 Latte = 20ml Susu + 1 shot Espresso)
CREATE TABLE IF NOT EXISTS product_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_needed DECIMAL(10,3) NOT NULL DEFAULT 1, -- How many units of inventory item needed per 1 product
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, inventory_item_id)
);

-- Enable RLS
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Authenticated users can read product_recipes" ON product_recipes;
DROP POLICY IF EXISTS "Admins can manage product_recipes" ON product_recipes;

-- RLS Policies - All authenticated users can read
CREATE POLICY "Authenticated users can read product_recipes"
ON product_recipes FOR SELECT TO authenticated USING (true);

-- Only owners/managers can modify recipes
CREATE POLICY "Admins can manage product_recipes"
ON product_recipes FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'manager')
  )
);

-- Function to check inventory availability for a product
CREATE OR REPLACE FUNCTION check_product_availability(
  p_product_id UUID,
  p_outlet_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS TABLE (
  is_available BOOLEAN,
  missing_items TEXT[]
) AS $$
DECLARE
  v_missing TEXT[] := '{}';
  v_available BOOLEAN := true;
  v_recipe RECORD;
BEGIN
  FOR v_recipe IN
    SELECT 
      pr.inventory_item_id,
      pr.quantity_needed * p_quantity AS needed,
      ii.name AS item_name,
      COALESCE(oi.quantity, 0) AS current_stock
    FROM product_recipes pr
    JOIN inventory_items ii ON ii.id = pr.inventory_item_id
    LEFT JOIN outlet_inventory oi ON oi.inventory_item_id = pr.inventory_item_id 
      AND oi.outlet_id = p_outlet_id
    WHERE pr.product_id = p_product_id
  LOOP
    IF v_recipe.current_stock < v_recipe.needed THEN
      v_available := false;
      v_missing := array_append(v_missing, v_recipe.item_name);
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_available, v_missing;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct inventory after sale
CREATE OR REPLACE FUNCTION deduct_inventory_for_sale(
  p_transaction_id UUID,
  p_outlet_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_item RECORD;
  v_recipe RECORD;
BEGIN
  -- Loop through each transaction item
  FOR v_item IN
    SELECT product_id, quantity 
    FROM transaction_items 
    WHERE transaction_id = p_transaction_id AND product_id IS NOT NULL
  LOOP
    -- Loop through each recipe ingredient
    FOR v_recipe IN
      SELECT inventory_item_id, quantity_needed
      FROM product_recipes
      WHERE product_id = v_item.product_id
    LOOP
      -- Deduct from outlet_inventory
      UPDATE outlet_inventory
      SET quantity = quantity - (v_recipe.quantity_needed * v_item.quantity),
          updated_at = now()
      WHERE outlet_id = p_outlet_id 
        AND inventory_item_id = v_recipe.inventory_item_id;
      
      -- Log the transaction
      INSERT INTO inventory_transactions (
        inventory_item_id, outlet_id, user_id, type, quantity, reference_id, notes
      ) VALUES (
        v_recipe.inventory_item_id,
        p_outlet_id,
        p_user_id,
        'sale',
        -(v_recipe.quantity_needed * v_item.quantity),
        p_transaction_id,
        'Auto-deducted from POS sale'
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add 'sale' to inventory_transaction_type if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'sale' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'inventory_transaction_type')
  ) THEN
    ALTER TYPE inventory_transaction_type ADD VALUE 'sale';
  END IF;
EXCEPTION WHEN others THEN
  NULL; -- ignore if type doesn't exist or value already exists
END $$;
