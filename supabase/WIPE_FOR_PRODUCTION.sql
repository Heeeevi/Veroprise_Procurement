-- ============================================================================
-- BARBERDOC ERP - WIPE ALL DATA FOR PRODUCTION
-- ============================================================================
-- ⚠️  WARNING: This will DELETE ALL DATA from the database!
-- ⚠️  Only run this ONCE before going live with real users
-- ⚠️  Make sure to backup any important test data first!
-- ============================================================================
-- Date: 2026-01-13
-- ============================================================================

-- Run this in Supabase SQL Editor

BEGIN;

-- ============================================================================
-- STEP 1: DISABLE TRIGGERS TEMPORARILY
-- ============================================================================
SET session_replication_role = replica;

-- ============================================================================
-- STEP 2: DELETE ALL TRANSACTIONAL DATA (in order of dependencies)
-- ============================================================================

-- Booking related
DELETE FROM public.bookings;

-- POS & Transactions
DELETE FROM public.transaction_items;
DELETE FROM public.transactions;
DELETE FROM public.shift_cash_mutations;
DELETE FROM public.shifts;

-- Inventory & Stock
DELETE FROM public.inventory_transactions;
DELETE FROM public.purchase_order_items;
DELETE FROM public.purchase_orders;
DELETE FROM public.product_outlet_stock;
DELETE FROM public.products;

-- HR & Payroll
DELETE FROM public.payroll;
DELETE FROM public.attendance;
DELETE FROM public.employees;

-- Finance
DELETE FROM public.expenses;

-- User & Outlet mappings (but keep outlet structure)
DELETE FROM public.user_outlets;

-- Services (delete all, will be re-added by owner)
DELETE FROM public.services;

-- ============================================================================
-- STEP 3: RESET COUNTERS / SEQUENCES IF ANY
-- ============================================================================
-- (No sequences to reset in current schema as we use UUID)

-- ============================================================================
-- STEP 4: KEEP MASTER DATA BUT CLEAN IT
-- ============================================================================

-- Delete all vendors (owner will add their own)
DELETE FROM public.vendors;
DELETE FROM public.partner_vendors;

-- Delete all outlets (owner will add their own)
DELETE FROM public.outlets;

-- Delete all profiles and roles (except you can keep one owner)
-- Comment out these 2 lines if you want to keep the owner account
-- DELETE FROM public.user_roles;
-- DELETE FROM public.profiles;

-- ============================================================================
-- STEP 5: RE-ENABLE TRIGGERS
-- ============================================================================
SET session_replication_role = DEFAULT;

COMMIT;

-- ============================================================================
-- STEP 6: VERIFY DATA IS CLEAN
-- ============================================================================
DO $$
DECLARE
    table_counts TEXT := '';
BEGIN
    -- Check counts
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATA WIPE COMPLETE - Verification:';
    RAISE NOTICE '========================================';
    
    RAISE NOTICE 'bookings: %', (SELECT COUNT(*) FROM public.bookings);
    RAISE NOTICE 'transactions: %', (SELECT COUNT(*) FROM public.transactions);
    RAISE NOTICE 'transaction_items: %', (SELECT COUNT(*) FROM public.transaction_items);
    RAISE NOTICE 'shifts: %', (SELECT COUNT(*) FROM public.shifts);
    RAISE NOTICE 'products: %', (SELECT COUNT(*) FROM public.products);
    RAISE NOTICE 'services: %', (SELECT COUNT(*) FROM public.services);
    RAISE NOTICE 'outlets: %', (SELECT COUNT(*) FROM public.outlets);
    RAISE NOTICE 'employees: %', (SELECT COUNT(*) FROM public.employees);
    RAISE NOTICE 'vendors: %', (SELECT COUNT(*) FROM public.vendors);
    RAISE NOTICE 'expenses: %', (SELECT COUNT(*) FROM public.expenses);
    RAISE NOTICE 'purchase_orders: %', (SELECT COUNT(*) FROM public.purchase_orders);
    RAISE NOTICE 'user_outlets: %', (SELECT COUNT(*) FROM public.user_outlets);
    RAISE NOTICE 'profiles: %', (SELECT COUNT(*) FROM public.profiles);
    RAISE NOTICE 'user_roles: %', (SELECT COUNT(*) FROM public.user_roles);
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All counts should be 0 (except profiles/user_roles if kept)';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 7: CREATE INITIAL OUTLET (Run this after wipe)
-- ============================================================================
-- Uncomment and modify this to create your first outlet:
/*
INSERT INTO public.outlets (id, name, address, phone)
VALUES (
    gen_random_uuid(),
    'BarberDoc Pusat',
    'Jl. Contoh No. 123, Jakarta',
    '08123456789'
);
*/

-- ============================================================================
-- STEP 8: ASSIGN OWNER TO OUTLET
-- ============================================================================
-- After creating outlet, run this to assign the owner:
/*
-- Get the owner's user_id from user_roles where role = 'owner'
-- Then insert into user_outlets

INSERT INTO public.user_outlets (user_id, outlet_id)
SELECT 
    ur.user_id,
    o.id
FROM public.user_roles ur
CROSS JOIN public.outlets o
WHERE ur.role = 'owner'
ON CONFLICT DO NOTHING;
*/

-- ============================================================================
-- STEP 9: ADD SERVICES (Barbershop Services)
-- ============================================================================
-- Uncomment to add default barbershop services:
/*
INSERT INTO public.services (name, description, price, duration_minutes, is_active) VALUES
('Potong Rambut Reguler', 'Potong rambut standar dengan clipper dan gunting', 50000, 30, true),
('Potong Rambut Premium', 'Potong rambut premium dengan styling', 75000, 45, true),
('Cukur Jenggot', 'Cukur dan rapikan jenggot dengan pisau cukur', 30000, 20, true),
('Hair Wash', 'Cuci rambut dengan shampoo dan conditioner', 25000, 15, true),
('Hair Coloring', 'Pewarnaan rambut full', 150000, 90, true),
('Creambath', 'Perawatan rambut dengan cream dan massage', 100000, 60, true),
('Kids Haircut', 'Potong rambut anak-anak', 40000, 25, true),
('Shaving', 'Cukur bersih wajah', 35000, 20, true),
('Hair Treatment', 'Perawatan rambut intensif', 125000, 60, true),
('Combo Package', 'Potong + Cukur + Wash', 90000, 60, true);
*/

-- ============================================================================
-- ✅ DONE! Database is now clean and ready for production
-- ============================================================================
-- Next steps:
-- 1. Owner login ke aplikasi
-- 2. Buat outlet baru di menu Users > Tab Outlet
-- 3. Assign diri sendiri ke outlet
-- 4. Tambah services di menu yang sesuai
-- 5. Tambah staff/manager jika ada
-- 6. Mulai gunakan POS!
-- ============================================================================
