-- ============================================================================
-- Migration: Add UNIQUE constraint on strategic_referrals.activity_id
-- Date: 2026-02-21
-- Purpose: The sync_strategic_referrals trigger uses ON CONFLICT (activity_id)
--          which requires a unique constraint. Without it, every activity INSERT
--          fails with "no unique or exclusion constraint matching the ON CONFLICT
--          specification".
-- ============================================================================

-- Add unique constraint (each activity maps to at most one strategic referral)
ALTER TABLE strategic_referrals
  ADD CONSTRAINT strategic_referrals_activity_id_key UNIQUE (activity_id);
