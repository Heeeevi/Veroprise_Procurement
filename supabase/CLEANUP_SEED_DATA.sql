-- ============================================================================
-- CLEANUP SEED DATA - DELETE ALL SAMPLE DATA
-- ============================================================================
-- WARNING: This will DELETE all seed data from the database
-- Only run this BEFORE entering production data
-- Make sure to BACKUP first if you have any important data!
-- ============================================================================

-- ============================================================================
-- STEP 1: DELETE IN CORRECT ORDER (Respect Foreign Keys)
-- ============================================================================

-- 1. Delete Bookings (has FK to outlets, transactions)
DELETE FROM public.bookings 
WHERE id IN (
    'ffff1111-1111-1111-1111-111111111111',
    'ffff1112-1111-1111-1111-111111111111',
    'ffff1113-1111-1111-1111-111111111111',
    'ffff2221-1111-1111-1111-111111111111',
    'ffff2222-1111-1111-1111-111111111111'
);

-- 2. Delete Outlet Inventory
DELETE FROM public.outlet_inventory 
WHERE outlet_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
);

-- 3. Delete Inventory Items
DELETE FROM public.inventory_items 
WHERE id LIKE 'cccc%';

-- 4. Delete Products/Services
DELETE FROM public.products 
WHERE id LIKE 'bbbb%';

-- 5. Delete Categories
DELETE FROM public.categories 
WHERE id LIKE 'aaaa%';

-- 6. Delete Partner Vendors
DELETE FROM public.partner_vendors 
WHERE id LIKE 'eeee%';

-- 7. Delete Expense Categories
DELETE FROM public.expense_categories 
WHERE id LIKE 'dddd%';

-- 8. Delete Outlets
DELETE FROM public.outlets 
WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
);

-- ============================================================================
-- STEP 2: VERIFY CLEANUP
-- ============================================================================

-- Check all tables are clean
SELECT 'Outlets' as table_name, COUNT(*) as remaining_count FROM public.outlets
UNION ALL
SELECT 'Categories', COUNT(*) FROM public.categories
UNION ALL
SELECT 'Products', COUNT(*) FROM public.products
UNION ALL
SELECT 'Inventory Items', COUNT(*) FROM public.inventory_items
UNION ALL
SELECT 'Outlet Inventory', COUNT(*) FROM public.outlet_inventory
UNION ALL
SELECT 'Bookings', COUNT(*) FROM public.bookings
UNION ALL
SELECT 'Expense Categories', COUNT(*) FROM public.expense_categories
UNION ALL
SELECT 'Vendors', COUNT(*) FROM public.partner_vendors;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SEED DATA CLEANUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All sample data has been deleted.';
    RAISE NOTICE 'Database is now ready for production data.';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Insert your real outlets';
    RAISE NOTICE '2. Insert your real categories';
    RAISE NOTICE '3. Insert your real products/services';
    RAISE NOTICE '4. Start using the system!';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- ALTERNATIVE: NUCLEAR OPTION - DELETE ALL DATA (Use with EXTREME caution!)
-- ============================================================================
-- Uncomment ONLY if you want to delete EVERYTHING including user data

/*
-- WARNING: This deletes EVERYTHING including users, transactions, etc.
-- Only use this if you want to start completely fresh

TRUNCATE TABLE public.bookings CASCADE;
TRUNCATE TABLE public.transaction_items CASCADE;
TRUNCATE TABLE public.transactions CASCADE;
TRUNCATE TABLE public.shifts CASCADE;
TRUNCATE TABLE public.inventory_transactions CASCADE;
TRUNCATE TABLE public.outlet_inventory CASCADE;
TRUNCATE TABLE public.product_recipes CASCADE;
TRUNCATE TABLE public.purchase_order_items CASCADE;
TRUNCATE TABLE public.purchase_orders CASCADE;
TRUNCATE TABLE public.expenses CASCADE;
TRUNCATE TABLE public.payroll_items CASCADE;
TRUNCATE TABLE public.payroll_runs CASCADE;
TRUNCATE TABLE public.attendance_logs CASCADE;
TRUNCATE TABLE public.employees CASCADE;
TRUNCATE TABLE public.products CASCADE;
TRUNCATE TABLE public.categories CASCADE;
TRUNCATE TABLE public.inventory_items CASCADE;
TRUNCATE TABLE public.partner_vendors CASCADE;
TRUNCATE TABLE public.expense_categories CASCADE;
TRUNCATE TABLE public.user_outlets CASCADE;
TRUNCATE TABLE public.outlets CASCADE;
-- Note: user_roles and profiles are NOT truncated to keep user accounts

-- Verify all clean
SELECT 
    schemaname,
    tablename,
    (xpath('/row/cnt/text()', 
        query_to_xml(format('SELECT COUNT(*) AS cnt FROM %I.%I', schemaname, tablename), false, true, ''))
    )[1]::text::int AS row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY row_count DESC, tablename;
*/
