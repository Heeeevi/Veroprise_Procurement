-- =====================================================
-- FIX: inventory_transactions RLS Policy
-- Allows authenticated users to insert/read inventory transactions
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "inventory_transactions_select" ON inventory_transactions;
DROP POLICY IF EXISTS "inventory_transactions_insert" ON inventory_transactions;
DROP POLICY IF EXISTS "inventory_transactions_update" ON inventory_transactions;
DROP POLICY IF EXISTS "inventory_transactions_delete" ON inventory_transactions;
DROP POLICY IF EXISTS "Users can view inventory transactions" ON inventory_transactions;
DROP POLICY IF EXISTS "Users can insert inventory transactions" ON inventory_transactions;

-- Enable RLS if not already
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "inventory_transactions_select" ON inventory_transactions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "inventory_transactions_insert" ON inventory_transactions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "inventory_transactions_update" ON inventory_transactions
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "inventory_transactions_delete" ON inventory_transactions
  FOR DELETE TO authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON inventory_transactions TO authenticated;
GRANT ALL ON inventory_transactions TO anon;

-- Verify policies
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'inventory_transactions';
