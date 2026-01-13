-- ============================================================================
-- SEED DATA FOR DEVELOPMENT & TESTING
-- BarberDoc ERP + Booking System
-- ============================================================================
-- Run this AFTER running COMPLETE_SCHEMA.sql
-- ============================================================================

-- ⚠️ WARNING: This will INSERT sample data
-- ✅ SAFE for: Development & Testing
-- ❌ DO NOT RUN in PRODUCTION with real data
-- 
-- 📝 To DELETE all seed data later, use: CLEANUP_SEED_DATA.sql
-- 
-- This seed data includes:
-- - 3 sample outlets (barbershop branches)
-- - 5 categories (Haircut, Styling, Grooming, Hair Color, Products)
-- - 33 products/services (Rp25k - Rp350k)
-- - 9 inventory items (supplies)
-- - 7 expense categories
-- - 3 vendor suppliers
-- - 5 sample bookings
-- ============================================================================

-- ============================================================================
-- SECTION 1: OUTLETS
-- ============================================================================

INSERT INTO public.outlets (id, name, address, phone, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Barber Main Branch', 'Jl. Sudirman No. 123, Jakarta', '021-12345678', true),
    ('22222222-2222-2222-2222-222222222222', 'Barber Mall Branch', 'Mall Grand Indonesia Lt. 3, Jakarta', '021-87654321', true),
    ('33333333-3333-3333-3333-333333333333', 'Barber South Branch', 'Jl. TB Simatupang No. 88, Jakarta', '021-99887766', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 2: CATEGORIES
-- ============================================================================

INSERT INTO public.categories (id, name, description, sort_order) VALUES
    ('aaaa1111-1111-1111-1111-111111111111', 'Haircut', 'Layanan potong rambut berbagai style', 1),
    ('aaaa2222-2222-2222-2222-222222222222', 'Styling', 'Styling & penataan rambut', 2),
    ('aaaa3333-3333-3333-3333-333333333333', 'Grooming', 'Grooming lengkap (cukur jenggot, facial)', 3),
    ('aaaa4444-4444-4444-4444-444444444444', 'Hair Color', 'Pewarnaan rambut', 4),
    ('aaaa5555-5555-5555-5555-555555555555', 'Products', 'Produk perawatan rambut', 5)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 3: PRODUCTS/SERVICES (LAYANAN BARBERSHOP)
-- ============================================================================
-- CATATAN PENTING:
-- - Booking Rp10.000 = DEPOSIT untuk amankan slot/seat saja
-- - Harga di bawah = harga LAYANAN sebenarnya yang dibayar di outlet
-- - Customer bayar deposit Rp10k saat booking online
-- - Customer bayar sisa harga layanan saat datang ke outlet

INSERT INTO public.products (id, category_id, name, description, price, cost_price, is_active) VALUES
    -- === HAIRCUT SERVICES (Rp35k - Rp100k) ===
    ('bbbb1101-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Basic Haircut', 'Potong rambut standar dengan gunting & clipper', 35000, 5000, true),
    ('bbbb1102-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Standard Haircut', 'Potong rambut + cuci rambut', 50000, 8000, true),
    ('bbbb1103-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Premium Haircut', 'Potong rambut + konsultasi style + head massage', 65000, 10000, true),
    ('bbbb1104-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Executive Haircut', 'Layanan premium dengan senior barber', 100000, 15000, true),
    ('bbbb1105-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Kids Haircut (3-12 tahun)', 'Potong rambut anak dengan sabar & fun', 30000, 4000, true),
    
    -- === STYLING & TREATMENT (Rp40k - Rp150k) ===
    ('bbbb2201-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Hair Wash & Blow', 'Cuci rambut + blow dry styling', 40000, 6000, true),
    ('bbbb2202-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Hair Styling Event', 'Styling rambut untuk acara formal', 80000, 15000, true),
    ('bbbb2203-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Hair Spa Treatment', 'Treatment spa rambut + scalp massage', 120000, 25000, true),
    ('bbbb2204-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Creambath Premium', 'Creambath dengan bahan premium + massage', 100000, 22000, true),
    ('bbbb2205-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Hair Tonic Treatment', 'Perawatan dengan hair tonic vitamin', 90000, 20000, true),
    
    -- === GROOMING & SHAVING (Rp25k - Rp200k) ===
    ('bbbb3301-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'Beard Trim Simple', 'Rapikan jenggot & kumis basic', 25000, 3000, true),
    ('bbbb3302-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'Beard Trim Premium', 'Rapikan & styling jenggot profesional', 40000, 5000, true),
    ('bbbb3303-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'Clean Shave', 'Cukur bersih dengan pisau cukur tradisional', 45000, 6000, true),
    ('bbbb3304-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'Beard Styling', 'Styling jenggot dengan teknik modern', 55000, 8000, true),
    ('bbbb3305-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'Face Grooming', 'Perawatan wajah + facial massage', 70000, 12000, true),
    ('bbbb3306-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'Complete Grooming Package', 'Haircut + Beard Trim + Face Treatment', 120000, 20000, true),
    ('bbbb3307-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'Royal Grooming Premium', 'Paket lengkap: Haircut + Shave + Massage + Spa', 200000, 35000, true),
    
    -- === HAIR COLORING (Rp150k - Rp350k) ===
    ('bbbb4401-1111-1111-1111-111111111111', 'aaaa4444-4444-4444-4444-444444444444', 'Highlight Color', 'Pewarnaan highlight sebagian rambut', 150000, 45000, true),
    ('bbbb4402-1111-1111-1111-111111111111', 'aaaa4444-4444-4444-4444-444444444444', 'Full Hair Color Standard', 'Pewarnaan seluruh rambut 1 warna', 200000, 60000, true),
    ('bbbb4403-1111-1111-1111-111111111111', 'aaaa4444-4444-4444-4444-444444444444', 'Ombre/Balayage', 'Teknik pewarnaan gradasi modern', 280000, 90000, true),
    ('bbbb4404-1111-1111-1111-111111111111', 'aaaa4444-4444-4444-4444-444444444444', 'Bleaching + Color', 'Bleaching rambut + pewarnaan custom', 300000, 100000, true),
    ('bbbb4405-1111-1111-1111-111111111111', 'aaaa4444-4444-4444-4444-444444444444', 'Fantasy Color Premium', 'Pewarnaan warna fantasy (biru, pink, dll)', 350000, 120000, true),
    
    -- === RETAIL PRODUCTS (Rp45k - Rp120k) ===
    ('bbbb5501-1111-1111-1111-111111111111', 'aaaa5555-5555-5555-5555-555555555555', 'Pomade Strong Hold', 'Pomade minyak kualitas premium 100g', 75000, 40000, true),
    ('bbbb5502-1111-1111-1111-111111111111', 'aaaa5555-5555-5555-5555-555555555555', 'Pomade Water Based', 'Pomade berbasis air, mudah dicuci 100g', 65000, 35000, true),
    ('bbbb5503-1111-1111-1111-111111111111', 'aaaa5555-5555-5555-5555-555555555555', 'Hair Wax Medium Hold', 'Wax untuk styling natural 80g', 60000, 32000, true),
    ('bbbb5504-1111-1111-1111-111111111111', 'aaaa5555-5555-5555-5555-555555555555', 'Hair Clay Matte Finish', 'Clay untuk tampilan matte 80g', 70000, 38000, true),
    ('bbbb5505-1111-1111-1111-111111111111', 'aaaa5555-5555-5555-5555-555555555555', 'Shampoo Anti Dandruff', 'Shampoo anti ketombe 250ml', 85000, 45000, true),
    ('bbbb5506-1111-1111-1111-111111111111', 'aaaa5555-5555-5555-5555-555555555555', 'Hair Tonic Growth', 'Tonik untuk pertumbuhan rambut 200ml', 95000, 50000, true),
    ('bbbb5507-1111-1111-1111-111111111111', 'aaaa5555-5555-5555-5555-555555555555', 'Beard Oil Premium', 'Minyak perawatan jenggot 50ml', 120000, 60000, true),
    ('bbbb5508-1111-1111-1111-111111111111', 'aaaa5555-5555-5555-5555-555555555555', 'Hair Spray Strong Hold', 'Hair spray tahan lama 300ml', 55000, 28000, true),
    ('bbbb5509-1111-1111-1111-111111111111', 'aaaa5555-5555-5555-5555-555555555555', 'Hair Serum Shine', 'Serum rambut untuk kilau 100ml', 90000, 48000, true),
    ('bbbb5510-1111-1111-1111-111111111111', 'aaaa5555-5555-5555-5555-555555555555', 'Comb Premium Wood', 'Sisir kayu premium handmade', 45000, 20000, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 4: INVENTORY ITEMS (Supplies)
-- ============================================================================

INSERT INTO public.inventory_items (id, name, unit, min_stock, current_stock, cost_per_unit) VALUES
    ('cccc1111-1111-1111-1111-111111111111', 'Shampoo Sachet', 'pcs', 100, 500, 2000),
    ('cccc2222-2222-2222-2222-222222222222', 'Conditioner', 'btl', 20, 50, 25000),
    ('cccc3333-3333-3333-3333-333333333333', 'Hair Gel', 'btl', 10, 30, 35000),
    ('cccc4444-4444-4444-4444-444444444444', 'Pomade Stock', 'pcs', 20, 80, 40000),
    ('cccc5555-5555-5555-5555-555555555555', 'Razor Blade', 'pcs', 50, 200, 5000),
    ('cccc6666-6666-6666-6666-666666666666', 'Towel', 'pcs', 30, 100, 15000),
    ('cccc7777-7777-7777-7777-777777777777', 'Hair Dye - Black', 'pcs', 10, 25, 45000),
    ('cccc8888-8888-8888-8888-888888888888', 'Hair Dye - Brown', 'pcs', 10, 25, 45000),
    ('cccc9999-9999-9999-9999-999999999999', 'Face Mask', 'box', 5, 15, 50000)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 5: OUTLET INVENTORY (Stock Distribution)
-- ============================================================================

INSERT INTO public.outlet_inventory (outlet_id, inventory_item_id, quantity) VALUES
    -- Main Branch
    ('11111111-1111-1111-1111-111111111111', 'cccc1111-1111-1111-1111-111111111111', 300),
    ('11111111-1111-1111-1111-111111111111', 'cccc2222-2222-2222-2222-222222222222', 30),
    ('11111111-1111-1111-1111-111111111111', 'cccc3333-3333-3333-3333-333333333333', 20),
    ('11111111-1111-1111-1111-111111111111', 'cccc4444-4444-4444-4444-444444444444', 50),
    ('11111111-1111-1111-1111-111111111111', 'cccc5555-5555-5555-5555-555555555555', 150),
    
    -- Mall Branch
    ('22222222-2222-2222-2222-222222222222', 'cccc1111-1111-1111-1111-111111111111', 150),
    ('22222222-2222-2222-2222-222222222222', 'cccc2222-2222-2222-2222-222222222222', 15),
    ('22222222-2222-2222-2222-222222222222', 'cccc4444-4444-4444-4444-444444444444', 25),
    ('22222222-2222-2222-2222-222222222222', 'cccc5555-5555-5555-5555-555555555555', 80),
    
    -- South Branch
    ('33333333-3333-3333-3333-333333333333', 'cccc1111-1111-1111-1111-111111111111', 50),
    ('33333333-3333-3333-3333-333333333333', 'cccc2222-2222-2222-2222-222222222222', 5),
    ('33333333-3333-3333-3333-333333333333', 'cccc5555-5555-5555-5555-555555555555', 20)
ON CONFLICT (outlet_id, inventory_item_id) DO UPDATE
    SET quantity = EXCLUDED.quantity;

-- ============================================================================
-- SECTION 6: EXPENSE CATEGORIES
-- ============================================================================

INSERT INTO public.expense_categories (id, name, description) VALUES
    ('dddd1111-1111-1111-1111-111111111111', 'Operasional', 'Biaya operasional harian'),
    ('dddd2222-2222-2222-2222-222222222222', 'Utilities', 'Listrik, air, internet, telepon'),
    ('dddd3333-3333-3333-3333-333333333333', 'Supplies', 'Pembelian supplies & peralatan'),
    ('dddd4444-4444-4444-4444-444444444444', 'Marketing', 'Biaya promosi, iklan, dan marketing'),
    ('dddd5555-5555-5555-5555-555555555555', 'Maintenance', 'Perawatan & perbaikan alat/tempat'),
    ('dddd6666-6666-6666-6666-666666666666', 'Transportation', 'Transportasi & pengiriman'),
    ('dddd7777-7777-7777-7777-777777777777', 'Other', 'Lain-lain')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 7: PARTNER VENDORS
-- ============================================================================

INSERT INTO public.partner_vendors (id, name, contact_person, phone, email, is_active) VALUES
    ('eeee1111-1111-1111-1111-111111111111', 'PT Supplies Indonesia', 'Budi Santoso', '021-11112222', 'budi@supplies.co.id', true),
    ('eeee2222-2222-2222-2222-222222222222', 'CV Hair Products', 'Siti Nurhaliza', '021-33334444', 'siti@hairproducts.com', true),
    ('eeee3333-3333-3333-3333-333333333333', 'Toko Kimia Jaya', 'Ahmad Dhani', '021-55556666', 'ahmad@kimiajaya.com', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 8: SAMPLE BOOKINGS (for testing)
-- ============================================================================

-- Booking untuk hari ini & besok
INSERT INTO public.bookings (id, outlet_id, customer_name, customer_email, customer_phone, slot_time, status, payment_status, payment_amount) VALUES
    -- Hari ini
    ('ffff1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'John Doe', 'john@example.com', '08123456789', CURRENT_DATE + INTERVAL '10 hours', 'pending', 'unpaid', 10000),
    ('ffff1112-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Jane Smith', 'jane@example.com', '08198765432', CURRENT_DATE + INTERVAL '11 hours', 'pending', 'unpaid', 10000),
    ('ffff1113-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Bob Wilson', 'bob@example.com', '08111223344', CURRENT_DATE + INTERVAL '14 hours', 'confirmed', 'paid', 10000),
    
    -- Besok
    ('ffff2221-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Alice Brown', 'alice@example.com', '08555666777', CURRENT_DATE + INTERVAL '1 day 9 hours', 'pending', 'unpaid', 10000),
    ('ffff2222-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Charlie Davis', 'charlie@example.com', '08777888999', CURRENT_DATE + INTERVAL '1 day 13 hours', 'pending', 'unpaid', 10000)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SEED DATA INSERTED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Outlets: 3 branches';
    RAISE NOTICE 'Categories: 5 categories (Haircut, Styling, Grooming, Hair Color, Products)';
    RAISE NOTICE 'Services: 23 layanan (Rp25k - Rp350k)';
    RAISE NOTICE 'Retail Products: 10 produk (Rp45k - Rp120k)';
    RAISE NOTICE 'Inventory Items: 9 supplies';
    RAISE NOTICE 'Expense Categories: 7 categories';
    RAISE NOTICE 'Vendors: 3 suppliers';
    RAISE NOTICE 'Sample Bookings: 5 bookings';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CATATAN PENTING:';
    RAISE NOTICE '- Booking Rp10.000 = DEPOSIT amankan seat';
    RAISE NOTICE '- Harga layanan asli dibayar di outlet';
    RAISE NOTICE '- Total 33 produk/layanan siap digunakan';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Create user account via Supabase Auth';
    RAISE NOTICE '2. Insert user_roles and profiles';
    RAISE NOTICE '3. Map user to outlet via user_outlets';
    RAISE NOTICE '4. Start testing POS & Booking!';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- HELPER: Sample User Setup (Manual - Replace UUIDs with actual auth.users id)
-- ============================================================================

-- After creating user via Supabase Auth, run this:
/*
-- Replace 'YOUR-USER-UUID-HERE' with actual user ID from auth.users

-- 1. Set user role
INSERT INTO public.user_roles (user_id, role) VALUES
    ('YOUR-USER-UUID-HERE', 'owner');

-- 2. Create profile
INSERT INTO public.profiles (user_id, full_name, phone) VALUES
    ('YOUR-USER-UUID-HERE', 'Admin User', '08123456789');

-- 3. Map user to outlet (give access to all outlets)
INSERT INTO public.user_outlets (user_id, outlet_id) VALUES
    ('YOUR-USER-UUID-HERE', '11111111-1111-1111-1111-111111111111'),
    ('YOUR-USER-UUID-HERE', '22222222-2222-2222-2222-222222222222'),
    ('YOUR-USER-UUID-HERE', '33333333-3333-3333-3333-333333333333');
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check inserted data
/*
SELECT 'Outlets' as table_name, COUNT(*) as count FROM outlets
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Categories', COUNT(*) FROM categories
UNION ALL
SELECT 'Inventory Items', COUNT(*) FROM inventory_items
UNION ALL
SELECT 'Bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'Expense Categories', COUNT(*) FROM expense_categories
UNION ALL
SELECT 'Vendors', COUNT(*) FROM partner_vendors;
*/
