-- =====================================================
-- FIX RLS POLICY FOR PROFILES - Allow owners to see all users
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;

-- Create new policy: Owners can see ALL profiles, others see only their own
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT
USING (
    auth.uid() = id  -- Users can always see their own profile
    OR 
    EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'owner'
    )  -- Owners can see all profiles
);

-- Update policy for all operations (insert/update/delete)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE
USING (
    auth.uid() = id  -- Users can update their own profile
    OR 
    EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'owner'
    )  -- Owners can update any profile
)
WITH CHECK (
    auth.uid() = id
    OR 
    EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'owner'
    )
);

-- Allow insert for authenticated users (for initial profile creation)
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT
WITH CHECK (true);

COMMENT ON TABLE profiles IS 'User profiles with role-based access - owners can see all';
