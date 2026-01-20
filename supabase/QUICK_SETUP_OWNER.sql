-- =====================================================
-- QUICK SETUP: Owner User + Demo Outlet + Warehouse
-- Copy-paste ini langsung di Supabase SQL Editor
-- =====================================================

-- 1. Setup profile as owner
INSERT INTO public.profiles (id, email, full_name, phone, role, created_at, updated_at)
VALUES (
    'f5ea2bae-0fc0-4f76-89b5-6a85a499f7b8',
    'vero@prise.com',
    'Veroprise Owner',
    '081234567890',
    'owner',
    NOW(),
    NOW()
)
ON CONFLICT (id) 
DO UPDATE SET
    role = 'owner',
    updated_at = NOW();

-- 2. Create demo outlet
INSERT INTO public.outlets (
    name,
    address,
    phone,
    email,
    status,
    opening_time,
    closing_time,
    max_booking_days_ahead
)
VALUES (
    'Veroprise Barbershop - Central',
    'Jl. Contoh No. 123, Jakarta Pusat',
    '021-12345678',
    'central@veroprise.com',
    'active',
    '09:00:00',
    '21:00:00',
    30
)
ON CONFLICT (id) DO NOTHING
RETURNING id;

-- 3. Assign owner to outlet (run this after getting outlet ID from step 2)
-- OR use this automated version:

DO $$
DECLARE
    v_outlet_id UUID;
BEGIN
    -- Get the outlet we just created
    SELECT id INTO v_outlet_id
    FROM public.outlets
    WHERE name = 'Veroprise Warehouse - Central'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Assign owner
    IF v_outlet_id IS NOT NULL THEN
        INSERT INTO public.user_outlets (user_id, outlet_id, role)
        VALUES (
            'f5ea2bae-0fc0-4f76-89b5-6a85a499f7b8',
            v_outlet_id,
            'owner'
        )
        ON CONFLICT (user_id, outlet_id) DO UPDATE SET role = 'owner';
        
        RAISE NOTICE '✅ Owner assigned to outlet';
    END IF;
END $$;

-- 4. Create demo warehouse
INSERT INTO public.warehouses (
    code,
    name,
    address,
    phone,
    warehouse_type,
    is_active
)
VALUES (
    'WH-001',
    'Veroprise Central Warehouse',
    'Jl. Gudang Raya No. 45, Jakarta',
    '021-87654321',
    'central',
    true
)
ON CONFLICT (code) DO NOTHING;

-- 5. Verify setup
SELECT 
    '✅ User Profile' as step,
    p.email,
    p.full_name,
    p.role::text as role
FROM public.profiles p
WHERE p.id = 'f5ea2bae-0fc0-4f76-89b5-6a85a499f7b8'

UNION ALL

SELECT 
    '✅ Outlet Assignment' as step,
    o.name as email,
    uo.role::text as full_name,
    'assigned' as role
FROM public.user_outlets uo
INNER JOIN public.outlets o ON o.id = uo.outlet_id
WHERE uo.user_id = 'f5ea2bae-0fc0-4f76-89b5-6a85a499f7b8'

UNION ALL

SELECT 
    '✅ Warehouse' as step,
    w.code as email,
    w.name as full_name,
    w.warehouse_type::text as role
FROM public.warehouses w
WHERE w.code = 'WH-001';

-- =====================================================
-- RESULT SHOULD SHOW:
-- ✅ User Profile  | vero@prise.com | Veroprise Owner | owner
-- ✅ Outlet Assignment | Veroprise Barbershop - Central | owner | assigned
-- ✅ Warehouse | WH-001 | Veroprise Central Warehouse | central
-- =====================================================
