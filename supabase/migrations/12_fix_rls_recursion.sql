-- =====================================================
-- FIX RLS POLICY RECURSION - Use security definer function
-- =====================================================

-- First, DROP the problematic policies that caused 500 errors
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create a security definer function to check if user is owner
-- This function runs with elevated privileges and bypasses RLS
CREATE OR REPLACE FUNCTION public.is_owner(user_id uuid)
RETURNS boolean AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
    RETURN user_role = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Now create simple, non-recursive RLS policies

-- SELECT: Everyone can read all profiles (simplest solution for now)
CREATE POLICY "profiles_select_all" ON profiles
FOR SELECT
USING (true);

-- UPDATE: Users can update own profile, owners can update any
CREATE POLICY "profiles_update_own_or_owner" ON profiles
FOR UPDATE
USING (
    auth.uid() = id 
    OR public.is_owner(auth.uid())
)
WITH CHECK (
    auth.uid() = id 
    OR public.is_owner(auth.uid())
);

-- INSERT: Allow inserts (for profile creation)
CREATE POLICY "profiles_insert_allow" ON profiles
FOR INSERT
WITH CHECK (true);

-- DELETE: Only owners can delete
CREATE POLICY "profiles_delete_owner" ON profiles
FOR DELETE
USING (public.is_owner(auth.uid()));

-- Also fix outlets table if it has similar issues
DROP POLICY IF EXISTS "outlets_select_policy" ON outlets;
DROP POLICY IF EXISTS "outlets_policy" ON outlets;

CREATE POLICY "outlets_select_all" ON outlets
FOR SELECT
USING (true);

-- Fix user_outlets table
DROP POLICY IF EXISTS "user_outlets_select_policy" ON user_outlets;
DROP POLICY IF EXISTS "user_outlets_policy" ON user_outlets;

CREATE POLICY "user_outlets_select_all" ON user_outlets
FOR SELECT
USING (true);

CREATE POLICY "user_outlets_insert_owner" ON user_outlets
FOR INSERT
WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "user_outlets_delete_owner" ON user_outlets
FOR DELETE
USING (public.is_owner(auth.uid()));

COMMENT ON FUNCTION public.is_owner IS 'Security definer function to check if user is owner - bypasses RLS';
