-- ============================================================================
-- Migration: Add missing constraints, indexes, and data integrity checks
-- Date: 2026-02-17
-- Purpose: Closes gaps identified in database architecture review
-- ============================================================================

-- ============================================================================
-- 1. Add missing foreign key: job_orders → client_corporations
-- ============================================================================

-- The client_corporation_id column exists but had no FK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'job_orders_client_corporation_id_fkey'
  ) THEN
    ALTER TABLE job_orders
      ADD CONSTRAINT job_orders_client_corporation_id_fkey
      FOREIGN KEY (client_corporation_id) REFERENCES client_corporations(id);
  END IF;
END $$;

-- ============================================================================
-- 2. Add CHECK constraints for date range validity
-- ============================================================================

-- business_rules: effective_until must be >= effective_from (or NULL)
ALTER TABLE business_rules
  DROP CONSTRAINT IF EXISTS chk_business_rules_date_range;
ALTER TABLE business_rules
  ADD CONSTRAINT chk_business_rules_date_range
  CHECK (effective_until IS NULL OR effective_until >= effective_from);

-- consultant_targets: period_end must be >= period_start
ALTER TABLE consultant_targets
  DROP CONSTRAINT IF EXISTS chk_consultant_targets_date_range;
ALTER TABLE consultant_targets
  ADD CONSTRAINT chk_consultant_targets_date_range
  CHECK (period_end >= period_start);

-- ============================================================================
-- 3. Add CHECK constraints for placements revenue type consistency
-- ============================================================================

-- Permanent placements must have fee_amount; contract must have gp_per_hour
ALTER TABLE placements
  DROP CONSTRAINT IF EXISTS chk_placements_revenue_fields;
ALTER TABLE placements
  ADD CONSTRAINT chk_placements_revenue_fields
  CHECK (
    (revenue_type = 'permanent' AND fee_amount IS NOT NULL) OR
    (revenue_type = 'contract' AND gp_per_hour IS NOT NULL)
  );

-- Contract placements: start_date must be <= end_date
ALTER TABLE placements
  DROP CONSTRAINT IF EXISTS chk_placements_contract_dates;
ALTER TABLE placements
  ADD CONSTRAINT chk_placements_contract_dates
  CHECK (
    revenue_type = 'permanent' OR
    (start_date IS NULL AND end_date IS NULL) OR
    (start_date <= end_date)
  );

-- ============================================================================
-- 4. Add missing indexes for query performance
-- ============================================================================

-- ingestion_runs: completed_at for "latest sync" queries
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_completed_at
  ON ingestion_runs (completed_at DESC);

-- ai_rate_limits: window cleanup queries
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_window_end
  ON private.ai_rate_limits (window_end);

-- activities: composite index for filtered time-series queries
CREATE INDEX IF NOT EXISTS idx_activities_type_date
  ON activities (activity_type, activity_date DESC);

-- user_profiles: active users filtering
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active
  ON user_profiles (is_active) WHERE is_active = true;

-- ============================================================================
-- 5. Add strategic_referrals sync trigger
-- ============================================================================

-- Automatically maintain strategic_referrals when activities are inserted
CREATE OR REPLACE FUNCTION sync_strategic_referrals()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activity_type = 'Strategic Referral' THEN
    INSERT INTO strategic_referrals (activity_id, consultant_id, referral_date)
    VALUES (NEW.id, NEW.consultant_id, NEW.activity_date::date)
    ON CONFLICT (activity_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_strategic_referrals ON activities;
CREATE TRIGGER trg_sync_strategic_referrals
  AFTER INSERT ON activities
  FOR EACH ROW
  EXECUTE FUNCTION sync_strategic_referrals();

-- Clean up strategic_referrals when activities are deleted
CREATE OR REPLACE FUNCTION cleanup_strategic_referrals()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM strategic_referrals WHERE activity_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_strategic_referrals ON activities;
CREATE TRIGGER trg_cleanup_strategic_referrals
  AFTER DELETE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_strategic_referrals();
