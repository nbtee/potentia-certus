-- =============================================================================
-- Monthly Targets Overhaul
-- Adds UNIQUE constraint for upsert, user RLS policy, bulk upsert function
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. UNIQUE constraint on (consultant_id, target_type, period_start)
--    Enables ON CONFLICT upsert for spreadsheet-style saves
-- ---------------------------------------------------------------------------
ALTER TABLE consultant_targets
  ADD CONSTRAINT uq_consultant_target_period
  UNIQUE (consultant_id, target_type, period_start);

-- ---------------------------------------------------------------------------
-- 2. RLS policy: users can read their own targets
--    Future-proofs for Stage I when blanket read-all is removed
-- ---------------------------------------------------------------------------
CREATE POLICY "users_read_own_targets" ON consultant_targets
  FOR SELECT TO authenticated
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Bulk upsert function (SECURITY DEFINER — runs as owner)
--    Accepts JSONB array of targets, validates admin/manager role, returns count
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_monthly_targets(
  p_targets JSONB,
  p_created_by UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_target JSONB;
  v_role TEXT;
BEGIN
  -- Check caller is admin or manager
  SELECT role INTO v_role
  FROM user_profiles
  WHERE id = p_created_by;

  IF v_role IS NULL OR v_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Insufficient permissions: admin or manager role required';
  END IF;

  -- Loop through each target and upsert
  FOR v_target IN SELECT * FROM jsonb_array_elements(p_targets)
  LOOP
    INSERT INTO consultant_targets (
      consultant_id,
      target_type,
      target_value,
      period_type,
      period_start,
      period_end,
      created_by
    ) VALUES (
      (v_target->>'consultant_id')::UUID,
      v_target->>'target_type',
      (v_target->>'target_value')::NUMERIC,
      'monthly',
      (v_target->>'period_start')::DATE,
      (v_target->>'period_end')::DATE,
      p_created_by
    )
    ON CONFLICT (consultant_id, target_type, period_start)
    DO UPDATE SET
      target_value = EXCLUDED.target_value,
      updated_at = NOW();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
