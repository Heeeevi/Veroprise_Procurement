-- =====================================================
-- PROFILE SYNC TRIGGER - Auto-create profile when user signs up
-- =====================================================

-- First, allow NULL for role column (owner will assign role later)
ALTER TABLE profiles ALTER COLUMN role DROP NOT NULL;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NULL, -- Default role is null, owner needs to assign
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to run on new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also sync existing users who don't have profiles yet
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    NULL,
    created_at,
    NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user signs up';
