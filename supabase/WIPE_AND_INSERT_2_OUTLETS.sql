-- =====================================================
-- BARBERDOC ERP - WIPE ALL DATA & INSERT 2 OUTLETS
-- =====================================================
-- Script ini akan:
-- 1. Menghapus SEMUA data dari semua tabel (yang ada)
-- 2. Insert 2 outlet: BarberDoc Hampor & BarberDoc Cabang Malayu
-- =====================================================

-- STEP 1: WIPE ALL DATA (sesuai schema yang benar)
-- =====================================================

-- Delete audit logs first (no foreign key dependencies)
DELETE FROM public.audit_logs WHERE true;

-- Delete transaction-related data first
DELETE FROM public.transaction_items WHERE true;
DELETE FROM public.transactions WHERE true;

-- Delete booking data
DELETE FROM public.bookings WHERE true;

-- Delete inventory-related data
DELETE FROM public.inventory_transactions WHERE true;
DELETE FROM public.outlet_inventory WHERE true;
DELETE FROM public.product_recipes WHERE true;
DELETE FROM public.inventory_items WHERE true;

-- Delete purchase order data
DELETE FROM public.purchase_order_items WHERE true;
DELETE FROM public.purchase_orders WHERE true;

-- Delete vendor data (correct table name)
DELETE FROM public.partner_vendors WHERE true;

-- Delete HR/Payroll data (correct table names)
DELETE FROM public.payroll_items WHERE true;
DELETE FROM public.payroll_runs WHERE true;
DELETE FROM public.attendance_logs WHERE true;
DELETE FROM public.employees WHERE true;

-- Delete expenses
DELETE FROM public.expenses WHERE true;
DELETE FROM public.expense_categories WHERE true;

-- Delete products and categories
DELETE FROM public.products WHERE true;
DELETE FROM public.categories WHERE true;

-- Delete shifts
DELETE FROM public.shifts WHERE true;

-- Delete user roles
DELETE FROM public.user_roles WHERE true;

-- Delete outlet assignments
DELETE FROM public.user_outlets WHERE true;

-- Delete outlets (will cascade to related data)
DELETE FROM public.outlets WHERE true;

-- Delete profiles (will cascade user_outlets)
DELETE FROM public.profiles WHERE true;

-- Note: auth.users cannot be deleted via SQL, must use Supabase dashboard or Auth API

-- =====================================================
-- STEP 2: INSERT 2 OUTLETS ONLY
-- =====================================================

INSERT INTO public.outlets (id, name, address, phone, is_active, created_at, updated_at)
VALUES 
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'BarberDoc Hampor',
    'Jl. Hampor Raya No. 123, Jakarta',
    '081234567890',
    true,
    NOW(),
    NOW()
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'BarberDoc Cabang Malayu',
    'Jl. Malayu No. 456, Jakarta',
    '081234567891',
    true,
    NOW(),
    NOW()
  );

-- =====================================================
-- DONE!
-- =====================================================

-- Hasil:
-- ✅ Semua data lama terhapus
-- ✅ 2 Outlet: BarberDoc Hampor & BarberDoc Cabang Malayu
--
-- Next Steps:
-- 1. Buat user baru via Supabase Auth
-- 2. Assign user ke outlet via user_outlets table:
--    INSERT INTO public.user_outlets (user_id, outlet_id, role)
--    VALUES ('your-user-uuid', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'owner');
-- 3. Buat kategori dan produk melalui UI sistem
-- 4. Mulai menggunakan sistem
