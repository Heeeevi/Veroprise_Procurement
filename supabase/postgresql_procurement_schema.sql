-- =====================================================
-- VEROPRISE ERP - PROCUREMENT & LOGISTICS MODULE
-- Target: Supabase PostgreSQL
-- Date: 2026-04-06
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------
-- ENUMS
-- -----------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'procurement_role') THEN
    CREATE TYPE procurement_role AS ENUM (
      'super_admin',
      'pengadaan',
      'gudang',
      'peracikan_bumbu',
      'unit_produksi',
      'owner'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_request_status') THEN
    CREATE TYPE material_request_status AS ENUM ('draft', 'submitted', 'approved', 'issued', 'received', 'rejected', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_receipt_source') THEN
    CREATE TYPE stock_receipt_source AS ENUM ('pengadaan', 'konversi_peracikan', 'retur_produksi', 'manual');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
    CREATE TYPE document_type AS ENUM ('surat_jalan', 'tanda_terima');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
    CREATE TYPE delivery_status AS ENUM ('draft', 'issued', 'delivered', 'received', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_session_status') THEN
    CREATE TYPE audit_session_status AS ENUM ('draft', 'in_progress', 'completed', 'approved');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'warehouse_movement_type') THEN
    CREATE TYPE warehouse_movement_type AS ENUM ('stock_in', 'stock_out', 'adjustment_plus', 'adjustment_minus', 'conversion_in', 'conversion_out');
  END IF;
END $$;

-- -----------------------------------------------------
-- HELPER FUNCTIONS
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------
-- ACCESS & ROLE MAPPING
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS procurement_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role procurement_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_procurement_user_roles_user ON procurement_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_procurement_user_roles_role ON procurement_user_roles(role);

DROP TRIGGER IF EXISTS trg_procurement_user_roles_updated_at ON procurement_user_roles;
CREATE TRIGGER trg_procurement_user_roles_updated_at
BEFORE UPDATE ON procurement_user_roles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION has_procurement_role(_roles procurement_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM procurement_user_roles pur
    WHERE pur.user_id = auth.uid()
      AND pur.is_active = TRUE
      AND pur.role = ANY(_roles)
  )
  OR EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'owner'::user_role
  );
$$;

-- -----------------------------------------------------
-- MATERIAL REQUEST (UNIT PRODUKSI -> GUDANG)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS material_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  requester_unit TEXT NOT NULL DEFAULT 'unit_produksi',
  status material_request_status NOT NULL DEFAULT 'draft',
  needed_date DATE,
  notes TEXT,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  fulfilled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS material_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_request_id UUID NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  requested_qty NUMERIC(15,2) NOT NULL CHECK (requested_qty > 0),
  approved_qty NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (approved_qty >= 0),
  issued_qty NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (issued_qty >= 0),
  received_qty NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (received_qty >= 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_requests_status ON material_requests(status);
CREATE INDEX IF NOT EXISTS idx_material_requests_date ON material_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_material_request_items_request ON material_request_items(material_request_id);

DROP TRIGGER IF EXISTS trg_material_requests_updated_at ON material_requests;
CREATE TRIGGER trg_material_requests_updated_at
BEFORE UPDATE ON material_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------
-- STOCK INTAKE (PENGADAAN + KONVERSI PERACIKAN)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS stock_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source stock_receipt_source NOT NULL,
  source_reference TEXT,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status transaction_status NOT NULL DEFAULT 'pending',
  received_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  posted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_receipt_id UUID NOT NULL REFERENCES stock_receipts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(15,2) NOT NULL CHECK (quantity > 0),
  conversion_factor NUMERIC(15,4) NOT NULL DEFAULT 1 CHECK (conversion_factor > 0),
  converted_quantity NUMERIC(15,2) NOT NULL,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_receipts_date ON stock_receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_source ON stock_receipts(source);
CREATE INDEX IF NOT EXISTS idx_stock_receipt_items_receipt ON stock_receipt_items(stock_receipt_id);

DROP TRIGGER IF EXISTS trg_stock_receipts_updated_at ON stock_receipts;
CREATE TRIGGER trg_stock_receipts_updated_at
BEFORE UPDATE ON stock_receipts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------
-- STOCK ADJUSTMENT (WAJIB KETERANGAN)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number TEXT NOT NULL UNIQUE,
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  status transaction_status NOT NULL DEFAULT 'pending',
  adjusted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_adjustment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_adjustment_id UUID NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  system_qty NUMERIC(15,2) NOT NULL,
  physical_qty NUMERIC(15,2) NOT NULL,
  variance_qty NUMERIC(15,2) GENERATED ALWAYS AS (physical_qty - system_qty) STORED,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_date ON stock_adjustments(adjustment_date);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_status ON stock_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_stock_adjustment_items_adjustment ON stock_adjustment_items(stock_adjustment_id);

DROP TRIGGER IF EXISTS trg_stock_adjustments_updated_at ON stock_adjustments;
CREATE TRIGGER trg_stock_adjustments_updated_at
BEFORE UPDATE ON stock_adjustments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------
-- SURAT JALAN / TANDA TERIMA
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS delivery_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number TEXT NOT NULL UNIQUE,
  doc_type document_type NOT NULL,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  material_request_id UUID REFERENCES material_requests(id) ON DELETE SET NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  receiver_unit TEXT NOT NULL DEFAULT 'unit_produksi',
  receiver_name TEXT,
  receiver_signature_url TEXT,
  status delivery_status NOT NULL DEFAULT 'draft',
  issued_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_document_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_document_id UUID NOT NULL REFERENCES delivery_documents(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(15,2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_documents_type ON delivery_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_delivery_documents_date ON delivery_documents(doc_date);
CREATE INDEX IF NOT EXISTS idx_delivery_document_items_doc ON delivery_document_items(delivery_document_id);

DROP TRIGGER IF EXISTS trg_delivery_documents_updated_at ON delivery_documents;
CREATE TRIGGER trg_delivery_documents_updated_at
BEFORE UPDATE ON delivery_documents
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------
-- DAILY STOCK AUDIT (AUDIT MANDIRI HARIAN)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS daily_stock_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_number TEXT NOT NULL UNIQUE,
  audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status audit_session_status NOT NULL DEFAULT 'draft',
  auditor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (warehouse_id, audit_date)
);

CREATE TABLE IF NOT EXISTS daily_stock_audit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_stock_audit_id UUID NOT NULL REFERENCES daily_stock_audits(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  system_qty NUMERIC(15,2) NOT NULL,
  physical_qty NUMERIC(15,2) NOT NULL,
  discrepancy_qty NUMERIC(15,2) GENERATED ALWAYS AS (physical_qty - system_qty) STORED,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_stock_audits_date ON daily_stock_audits(audit_date);
CREATE INDEX IF NOT EXISTS idx_daily_stock_audits_status ON daily_stock_audits(status);
CREATE INDEX IF NOT EXISTS idx_daily_stock_audit_items_audit ON daily_stock_audit_items(daily_stock_audit_id);

DROP TRIGGER IF EXISTS trg_daily_stock_audits_updated_at ON daily_stock_audits;
CREATE TRIGGER trg_daily_stock_audits_updated_at
BEFORE UPDATE ON daily_stock_audits
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------
-- WAREHOUSE MOVEMENT LOG (REALTIME SOURCE)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS warehouse_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type warehouse_movement_type NOT NULL,
  quantity NUMERIC(15,2) NOT NULL,
  reference_table TEXT,
  reference_id UUID,
  note TEXT,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_movements_date ON warehouse_stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_movements_warehouse ON warehouse_stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_movements_product ON warehouse_stock_movements(product_id);

-- -----------------------------------------------------
-- POSTING FUNCTIONS
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION post_stock_receipt(_receipt_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  target_warehouse UUID;
BEGIN
  SELECT warehouse_id INTO target_warehouse FROM stock_receipts WHERE id = _receipt_id;

  IF target_warehouse IS NULL THEN
    RAISE EXCEPTION 'Stock receipt % not found', _receipt_id;
  END IF;

  FOR rec IN
    SELECT sri.product_id, sri.converted_quantity, sri.unit_cost
    FROM stock_receipt_items sri
    WHERE sri.stock_receipt_id = _receipt_id
  LOOP
    INSERT INTO warehouse_inventory (
      id, warehouse_id, product_id, quantity, min_stock, max_stock, cost_per_unit, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), target_warehouse, rec.product_id, rec.converted_quantity, 0, NULL, rec.unit_cost, NOW(), NOW()
    )
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET
      quantity = warehouse_inventory.quantity + EXCLUDED.quantity,
      cost_per_unit = CASE
        WHEN EXCLUDED.cost_per_unit > 0 THEN EXCLUDED.cost_per_unit
        ELSE warehouse_inventory.cost_per_unit
      END,
      updated_at = NOW();

    INSERT INTO warehouse_stock_movements (
      warehouse_id, product_id, movement_type, quantity, reference_table, reference_id, note, performed_by
    )
    VALUES (
      target_warehouse,
      rec.product_id,
      'stock_in',
      rec.converted_quantity,
      'stock_receipts',
      _receipt_id,
      'Stock masuk dari proses penerimaan',
      auth.uid()
    );
  END LOOP;

  UPDATE stock_receipts
  SET status = 'completed',
      posted_by = auth.uid(),
      posted_at = NOW(),
      updated_at = NOW()
  WHERE id = _receipt_id
    AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION apply_stock_adjustment(_adjustment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  target_warehouse UUID;
BEGIN
  SELECT warehouse_id INTO target_warehouse FROM stock_adjustments WHERE id = _adjustment_id;

  IF target_warehouse IS NULL THEN
    RAISE EXCEPTION 'Stock adjustment % not found', _adjustment_id;
  END IF;

  FOR rec IN
    SELECT sai.product_id, sai.variance_qty
    FROM stock_adjustment_items sai
    WHERE sai.stock_adjustment_id = _adjustment_id
  LOOP
    UPDATE warehouse_inventory wi
    SET quantity = GREATEST(0, wi.quantity + rec.variance_qty),
        updated_at = NOW()
    WHERE wi.warehouse_id = target_warehouse
      AND wi.product_id = rec.product_id;

    INSERT INTO warehouse_stock_movements (
      warehouse_id, product_id, movement_type, quantity, reference_table, reference_id, note, performed_by
    )
    VALUES (
      target_warehouse,
      rec.product_id,
      CASE WHEN rec.variance_qty >= 0 THEN 'adjustment_plus' ELSE 'adjustment_minus' END,
      rec.variance_qty,
      'stock_adjustments',
      _adjustment_id,
      'Penyesuaian stok manual',
      auth.uid()
    );
  END LOOP;

  UPDATE stock_adjustments
  SET status = 'completed',
      approved_by = auth.uid(),
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = _adjustment_id
    AND status = 'pending';
END;
$$;

-- -----------------------------------------------------
-- RLS
-- -----------------------------------------------------

ALTER TABLE procurement_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stock_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stock_audit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock_movements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'procurement_user_roles' AND policyname = 'pur_admin_access'
  ) THEN
    CREATE POLICY pur_admin_access ON procurement_user_roles
      FOR ALL
      USING (has_procurement_role(ARRAY['super_admin','owner']::procurement_role[]))
      WITH CHECK (has_procurement_role(ARRAY['super_admin','owner']::procurement_role[]));
  END IF;
END $$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'material_requests',
      'material_request_items',
      'stock_receipts',
      'stock_receipt_items',
      'stock_adjustments',
      'stock_adjustment_items',
      'delivery_documents',
      'delivery_document_items',
      'daily_stock_audits',
      'daily_stock_audit_items',
      'warehouse_stock_movements'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
        AND policyname = tbl || '_role_access'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL USING (has_procurement_role(ARRAY[''super_admin'',''owner'',''pengadaan'',''gudang'',''peracikan_bumbu'',''unit_produksi'']::procurement_role[])) WITH CHECK (has_procurement_role(ARRAY[''super_admin'',''owner'',''pengadaan'',''gudang'',''peracikan_bumbu'',''unit_produksi'']::procurement_role[]));',
        tbl || '_role_access',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------
-- REALTIME PUBLICATION FOR DAILY AUDIT + STOCK MOVEMENT
-- -----------------------------------------------------

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'material_requests',
      'stock_receipts',
      'stock_adjustments',
      'delivery_documents',
      'daily_stock_audits',
      'warehouse_stock_movements',
      'warehouse_inventory'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------
-- OPTIONAL SEED ROLE MAPPING (safe for rerun)
-- -----------------------------------------------------
-- INSERT INTO procurement_user_roles (user_id, role, notes)
-- VALUES
--   ('<uuid-super-admin>', 'super_admin', 'Initial super admin'),
--   ('<uuid-pengadaan>', 'pengadaan', 'Procurement officer'),
--   ('<uuid-gudang>', 'gudang', 'Warehouse officer'),
--   ('<uuid-peracikan>', 'peracikan_bumbu', 'Peracikan team'),
--   ('<uuid-unit-produksi>', 'unit_produksi', 'Production requester')
-- ON CONFLICT (user_id, role) DO NOTHING;
