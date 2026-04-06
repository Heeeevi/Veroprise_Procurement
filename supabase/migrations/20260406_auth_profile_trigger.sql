-- Auto-create public.profiles from auth.users
-- Run this once in Supabase SQL Editor or via migration deployment.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role_text TEXT;
BEGIN
    v_role_text := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');

    INSERT INTO public.profiles (id, email, full_name, phone, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NULLIF(NEW.raw_user_meta_data->>'phone', ''),
        CASE
            WHEN v_role_text IN ('owner', 'manager', 'staff', 'customer') THEN v_role_text::user_role
            ELSE 'customer'::user_role
        END,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();