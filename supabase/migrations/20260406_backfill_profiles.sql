-- Backfill public.profiles from existing auth.users rows.
-- Run once after the auth trigger is installed.

INSERT INTO public.profiles (id, email, full_name, phone, role, created_at, updated_at)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email),
    NULLIF(u.raw_user_meta_data->>'phone', ''),
    CASE
        WHEN COALESCE(u.raw_user_meta_data->>'role', 'customer') IN ('owner', 'manager', 'staff', 'customer')
            THEN COALESCE(u.raw_user_meta_data->>'role', 'customer')::user_role
        ELSE 'customer'::user_role
    END,
    COALESCE(u.created_at, NOW()),
    NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;