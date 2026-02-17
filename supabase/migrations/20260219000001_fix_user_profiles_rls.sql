-- =============================================================================
-- Fix: user_profiles RLS infinite recursion
-- The admins_manage_user_profiles policy queried user_profiles to check role,
-- which triggered RLS on user_profiles again → infinite loop.
-- Solution: SECURITY DEFINER function bypasses RLS for the admin check.
-- =============================================================================

-- 1. Create helper function (runs as owner, bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin TO authenticated;

-- 2. Drop the broken policy
DROP POLICY IF EXISTS admins_manage_user_profiles ON user_profiles;

-- 3. Recreate using the SECURITY DEFINER function (no recursion)
CREATE POLICY admins_manage_user_profiles ON user_profiles
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 4. Also update other admin policies to use is_admin() for consistency
DROP POLICY IF EXISTS admins_manage_org_hierarchy ON org_hierarchy;
CREATE POLICY admins_manage_org_hierarchy ON org_hierarchy
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS admins_manage_data_assets ON data_assets;
CREATE POLICY admins_manage_data_assets ON data_assets
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS admins_manage_context_documents ON context_documents;
CREATE POLICY admins_manage_context_documents ON context_documents
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS admins_manage_unmatched_terms ON unmatched_terms;
CREATE POLICY admins_manage_unmatched_terms ON unmatched_terms
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
