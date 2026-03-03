-- =============================================================================
-- Migration: Security Hardening — Write Path Protection
-- Fixes found during Stage I security audit:
--   1. admins_manage_business_rules — inline subquery (recursion risk)
--   2. admins_manage_targets — inline subquery (recursion risk)
--   3. write_audit_log() — no caller validation (any user can inject audit entries)
--   4. log_unmatched_term() — no input validation or rate gating
--   5. Private schema tables lack RLS (defense-in-depth)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create is_admin_or_manager() SECURITY DEFINER function
--    Same pattern as is_admin(). Used by consultant_targets policy where
--    managers also need write access.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin_or_manager TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Fix admins_manage_business_rules — use is_admin() instead of inline subquery
--    Original policy (20260213000000_initial_schema.sql:526-533) was missed when
--    other admin policies were fixed in 20260219000001_fix_user_profiles_rls.sql.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "admins_manage_business_rules" ON business_rules;

CREATE POLICY "admins_manage_business_rules" ON business_rules
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- 3. Fix admins_manage_targets — use is_admin_or_manager() instead of inline subquery
--    Original policy (20260213000000_initial_schema.sql:535-542) had same recursion
--    risk. Uses is_admin_or_manager() because managers need target write access.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "admins_manage_targets" ON consultant_targets;

CREATE POLICY "admins_manage_targets" ON consultant_targets
  FOR ALL TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

-- ---------------------------------------------------------------------------
-- 4. Harden write_audit_log() — restrict to admin callers only
--    Previously any authenticated user could call supabase.rpc('write_audit_log')
--    to inject fake audit entries. All legitimate callers are admin server actions
--    that already verify requireAdmin(), so restricting to is_admin() is correct.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION write_audit_log(
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Only admins can write audit log entries
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  INSERT INTO private.audit_log (id, user_id, action, table_name, record_id, old_values, new_values, created_at)
  VALUES (
    gen_random_uuid(),
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values,
    NOW()
  )
  RETURNING private.audit_log.id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Harden log_unmatched_term() — add auth check, input validation, rate gating
--    Previously any authenticated user could insert arbitrary rows into
--    unmatched_terms via supabase.rpc('log_unmatched_term'). Legitimate calls
--    come only from the AI chat route. Adding auth validation, input length
--    limits, and per-user rate gating (max 20 terms per minute).
-- ---------------------------------------------------------------------------

-- Add logged_by column to track who logged each term (needed for rate gating)
ALTER TABLE unmatched_terms
  ADD COLUMN IF NOT EXISTS logged_by UUID REFERENCES user_profiles(id);

CREATE INDEX IF NOT EXISTS idx_unmatched_terms_logged_by_created
  ON unmatched_terms(logged_by, created_at);

CREATE OR REPLACE FUNCTION log_unmatched_term(
  p_user_query TEXT,
  p_unmatched_term TEXT,
  p_suggested_asset_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_user_id UUID;
  v_recent_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Input validation: reject excessively long inputs
  IF length(p_user_query) > 500 THEN
    RAISE EXCEPTION 'user_query exceeds maximum length (500 characters)';
  END IF;
  IF length(p_unmatched_term) > 200 THEN
    RAISE EXCEPTION 'unmatched_term exceeds maximum length (200 characters)';
  END IF;

  -- Rate gating: max 20 unmatched term logs per user per minute
  SELECT COUNT(*) INTO v_recent_count
  FROM unmatched_terms
  WHERE logged_by = v_user_id
    AND created_at > NOW() - INTERVAL '1 minute';

  IF v_recent_count >= 20 THEN
    RAISE EXCEPTION 'Rate limit exceeded for unmatched term logging';
  END IF;

  INSERT INTO unmatched_terms (user_query, unmatched_term, resolution_status, logged_by)
  VALUES (p_user_query, p_unmatched_term, 'pending', v_user_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Enable RLS on private schema tables (defense-in-depth)
--    These tables are already protected by SECURITY DEFINER function access,
--    but adding RLS with USING(false) ensures no direct access is possible
--    even if a function bug or future change exposes them.
-- ---------------------------------------------------------------------------
ALTER TABLE private.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Deny all direct access — only SECURITY DEFINER functions can reach these
CREATE POLICY "no_direct_access" ON private.audit_log
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "no_direct_access" ON private.ai_rate_limits
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- 7. Document intentional read-all model
--    All SELECT policies use USING (true) by design. This is NOT an oversight —
--    Potentia uses a transparent sales culture where all consultants can see all
--    performance data, matching the existing Bullhorn access model. The security
--    concern is account compromise (write path), not data visibility (read path).
-- ---------------------------------------------------------------------------
COMMENT ON POLICY "authenticated_users_read_all" ON activities
  IS 'Intentional: transparent sales culture — all authenticated users see all performance data';
COMMENT ON POLICY "authenticated_users_read_all" ON placements
  IS 'Intentional: transparent sales culture — all authenticated users see all performance data';
COMMENT ON POLICY "authenticated_users_read_all" ON submission_status_log
  IS 'Intentional: transparent sales culture — all authenticated users see all performance data';
COMMENT ON POLICY "authenticated_users_read_all" ON job_orders
  IS 'Intentional: transparent sales culture — all authenticated users see all performance data';
COMMENT ON POLICY "authenticated_users_read_all" ON candidates
  IS 'Intentional: transparent sales culture — all authenticated users see all performance data';
COMMENT ON POLICY "authenticated_users_read_all" ON client_corporations
  IS 'Intentional: transparent sales culture — all authenticated users see all performance data';
COMMENT ON POLICY "authenticated_users_read_all" ON strategic_referrals
  IS 'Intentional: transparent sales culture — all authenticated users see all performance data';
COMMENT ON POLICY "authenticated_users_read_all" ON org_hierarchy
  IS 'Intentional: org structure is not sensitive — visible to all authenticated users';
COMMENT ON POLICY "authenticated_users_read_all" ON user_profiles
  IS 'Intentional: user directory is not sensitive — visible to all authenticated users';
COMMENT ON POLICY "authenticated_users_read_all" ON business_rules
  IS 'Intentional: rules are reference data — visible to all authenticated users';
COMMENT ON POLICY "authenticated_users_read_all" ON consultant_targets
  IS 'Intentional: targets are visible to all for transparency and accountability';
COMMENT ON POLICY "authenticated_users_read_all" ON data_assets
  IS 'Intentional: asset definitions are reference data — visible to all authenticated users';
COMMENT ON POLICY "authenticated_users_read_all" ON dashboards
  IS 'Intentional: dashboards are shared — visible to all authenticated users';
COMMENT ON POLICY "authenticated_users_read_all" ON dashboard_widgets
  IS 'Intentional: dashboard widgets are shared — visible to all authenticated users';
COMMENT ON POLICY "authenticated_users_read_all" ON context_documents
  IS 'Intentional: context docs are reference data — visible to all authenticated users';
COMMENT ON POLICY "authenticated_users_read_all" ON unmatched_terms
  IS 'Intentional: unmatched terms are reference data — visible to all authenticated users';
COMMENT ON POLICY "authenticated_users_read_all" ON ingestion_runs
  IS 'Intentional: ingestion status is not sensitive — visible to all authenticated users';
