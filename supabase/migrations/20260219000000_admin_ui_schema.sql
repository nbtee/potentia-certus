-- =============================================================================
-- Migration: Admin UI Schema Changes
-- Stage G: Add columns, RLS policies, and SECURITY DEFINER functions for admin
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add period_type to consultant_targets
-- ---------------------------------------------------------------------------
ALTER TABLE consultant_targets
  ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'monthly'
    CHECK (period_type IN ('weekly', 'monthly'));

-- ---------------------------------------------------------------------------
-- 2. Add deactivated_at to user_profiles
-- ---------------------------------------------------------------------------
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 3. Admin write RLS policies
-- ---------------------------------------------------------------------------

-- user_profiles: admins can INSERT/UPDATE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles' AND policyname = 'admins_manage_user_profiles'
  ) THEN
    CREATE POLICY admins_manage_user_profiles ON user_profiles
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'admin'
        )
      );
  END IF;
END $$;

-- org_hierarchy: admins can manage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'org_hierarchy' AND policyname = 'admins_manage_org_hierarchy'
  ) THEN
    CREATE POLICY admins_manage_org_hierarchy ON org_hierarchy
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'admin'
        )
      );
  END IF;
END $$;

-- data_assets: admins can manage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'data_assets' AND policyname = 'admins_manage_data_assets'
  ) THEN
    CREATE POLICY admins_manage_data_assets ON data_assets
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'admin'
        )
      );
  END IF;
END $$;

-- context_documents: admins can manage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'context_documents' AND policyname = 'admins_manage_context_documents'
  ) THEN
    CREATE POLICY admins_manage_context_documents ON context_documents
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'admin'
        )
      );
  END IF;
END $$;

-- unmatched_terms: admins can manage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'unmatched_terms' AND policyname = 'admins_manage_unmatched_terms'
  ) THEN
    CREATE POLICY admins_manage_unmatched_terms ON unmatched_terms
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'admin'
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. SECURITY DEFINER function: get_audit_logs
-- Allows admin users to read from private.audit_log
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_audit_logs(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_user_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_table_name TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  action TEXT,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Only admins can read audit logs
  SELECT up.role INTO v_role
  FROM user_profiles up
  WHERE up.id = auth.uid();

  IF v_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.user_id,
    up.email AS user_email,
    al.action,
    al.table_name,
    al.record_id,
    al.old_values,
    al.new_values,
    al.ip_address,
    al.user_agent,
    al.created_at,
    COUNT(*) OVER() AS total_count
  FROM private.audit_log al
  LEFT JOIN user_profiles up ON up.id = al.user_id
  WHERE
    (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_table_name IS NULL OR al.table_name = p_table_name)
    AND (p_date_from IS NULL OR al.created_at >= p_date_from)
    AND (p_date_to IS NULL OR al.created_at <= p_date_to)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. SECURITY DEFINER function: write_audit_log
-- Allows authenticated users to insert into private.audit_log
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION write_audit_log TO authenticated;
