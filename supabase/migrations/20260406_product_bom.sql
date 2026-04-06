-- =====================================================
-- VEROPRISE ERP - PRODUCT BOM (Bill of Materials)
-- Target: Supabase PostgreSQL
-- Date: 2026-04-06
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- BOM mapping: finished product -> ingredient products
CREATE TABLE IF NOT EXISTS product_bom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(15,4) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'pcs',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_product_bom_not_self CHECK (product_id <> ingredient_product_id),
  CONSTRAINT uq_product_bom_product_ingredient UNIQUE (product_id, ingredient_product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_bom_items_product ON product_bom_items(product_id);
CREATE INDEX IF NOT EXISTS idx_product_bom_items_ingredient ON product_bom_items(ingredient_product_id);

-- Keep updated_at fresh for edits
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    DROP TRIGGER IF EXISTS trg_product_bom_items_updated_at ON product_bom_items;
    CREATE TRIGGER trg_product_bom_items_updated_at
    BEFORE UPDATE ON product_bom_items
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  ELSIF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS trg_product_bom_items_updated_at ON product_bom_items;
    CREATE TRIGGER trg_product_bom_items_updated_at
    BEFORE UPDATE ON product_bom_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Ensure table is available via RLS
ALTER TABLE product_bom_items ENABLE ROW LEVEL SECURITY;

-- Explicit grants so PostgREST can expose the table for client roles.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE product_bom_items TO anon, authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_bom_items'
      AND policyname = 'Authenticated users can manage product_bom_items'
  ) THEN
    CREATE POLICY "Authenticated users can manage product_bom_items"
    ON product_bom_items
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- RPC to deduct BOM ingredients from outlet inventory when a sale is posted.
CREATE OR REPLACE FUNCTION deduct_inventory_for_sale(
  p_transaction_id UUID,
  p_outlet_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  tx_item RECORD;
  bom_item RECORD;
  v_deduct_qty NUMERIC(15,4);
BEGIN
  FOR tx_item IN
    SELECT ti.product_id, ti.quantity
    FROM transaction_items ti
    WHERE ti.transaction_id = p_transaction_id
  LOOP
    FOR bom_item IN
      SELECT pbi.ingredient_product_id, pbi.quantity, pbi.unit
      FROM product_bom_items pbi
      WHERE pbi.product_id = tx_item.product_id
    LOOP
      v_deduct_qty := COALESCE(tx_item.quantity, 0) * COALESCE(bom_item.quantity, 0);

      IF v_deduct_qty <= 0 THEN
        CONTINUE;
      END IF;

      UPDATE inventory inv
      SET
        quantity = GREATEST(inv.quantity - v_deduct_qty, 0),
        updated_at = NOW()
      WHERE inv.outlet_id = p_outlet_id
        AND inv.product_id = bom_item.ingredient_product_id;

      IF FOUND THEN
        INSERT INTO inventory_transactions (
          outlet_id,
          product_id,
          transaction_type,
          quantity,
          reference_id,
          reference_type,
          notes,
          performed_by
        )
        VALUES (
          p_outlet_id,
          bom_item.ingredient_product_id,
          'out',
          -v_deduct_qty,
          p_transaction_id,
          'sale_bom',
          'Pemakaian BOM dari transaksi penjualan',
          p_user_id
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_inventory_for_sale(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_inventory_for_sale(UUID, UUID, UUID) TO service_role;

-- Force PostgREST to refresh schema cache after BOM objects are created/granted.
NOTIFY pgrst, 'reload schema';
