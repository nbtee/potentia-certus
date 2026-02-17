-- ============================================================================
-- Seed Widget Test Data
-- Created: 2026-02-17
--
-- Seeds additional data needed for new widget types:
-- - consultant_targets (for Target Gauge widget)
-- - submission_status_log (for Funnel and Conversion widgets)
-- ============================================================================

-- ============================================================================
-- SEED CONSULTANT TARGETS
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_consultant_targets() RETURNS void AS $$
DECLARE
  user_ids UUID[];
  user_count INT;
  uid UUID;
  target_types TEXT[] := ARRAY['calls', 'submittals', 'placements', 'revenue'];
  target_values NUMERIC[] := ARRAY[200, 15, 5, 50000];
  i INT;
BEGIN
  SELECT array_agg(id) INTO user_ids FROM user_profiles;
  user_count := array_length(user_ids, 1);

  IF user_count IS NULL OR user_count = 0 THEN
    RAISE NOTICE 'No user profiles found. Skipping consultant_targets seed.';
    RETURN;
  END IF;

  FOREACH uid IN ARRAY user_ids LOOP
    FOR i IN 1..array_length(target_types, 1) LOOP
      INSERT INTO consultant_targets (
        consultant_id, target_type, target_value,
        period_start, period_end, metadata
      ) VALUES (
        uid,
        target_types[i],
        target_values[i] * (0.8 + random() * 0.4), -- vary ±20%
        date_trunc('month', CURRENT_DATE)::DATE,
        (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
        jsonb_build_object('seed_data', true)
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seeded consultant targets for % users', user_count;
END;
$$ LANGUAGE plpgsql;

SELECT seed_consultant_targets();
DROP FUNCTION seed_consultant_targets();

-- ============================================================================
-- SEED SUBMISSION STATUS LOG (Funnel Data)
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_submission_status_log() RETURNS void AS $$
DECLARE
  user_ids UUID[];
  user_count INT;
  statuses TEXT[] := ARRAY[
    'Submitted',
    'Client Review',
    'Interview Scheduled',
    'Interview Complete',
    'Offer Extended',
    'Placed'
  ];
  -- Each stage has progressively fewer entries (funnel shape)
  stage_counts INT[] := ARRAY[120, 80, 50, 35, 15, 8];
  uid UUID;
  base_date TIMESTAMPTZ;
  i INT;
  j INT;
  submission_id INT;
BEGIN
  SELECT array_agg(id) INTO user_ids FROM user_profiles;
  user_count := array_length(user_ids, 1);

  IF user_count IS NULL OR user_count = 0 THEN
    RAISE NOTICE 'No user profiles found. Skipping submission_status_log seed.';
    RETURN;
  END IF;

  submission_id := 5000;

  FOR i IN 1..array_length(statuses, 1) LOOP
    FOR j IN 1..stage_counts[i] LOOP
      uid := user_ids[1 + floor(random() * user_count)::INT];
      base_date := CURRENT_TIMESTAMP - (floor(random() * 60)::INT || ' days')::INTERVAL;
      submission_id := submission_id + 1;

      INSERT INTO submission_status_log (
        bullhorn_submission_id,
        consultant_id,
        status_from,
        status_to,
        detected_at,
        metadata
      ) VALUES (
        submission_id,
        uid,
        CASE WHEN i > 1 THEN statuses[i - 1] ELSE NULL END,
        statuses[i],
        base_date,
        jsonb_build_object('seed_data', true)
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seeded % submission status log entries',
    (SELECT COUNT(*) FROM submission_status_log WHERE metadata->>'seed_data' = 'true');
END;
$$ LANGUAGE plpgsql;

SELECT seed_submission_status_log();
DROP FUNCTION seed_submission_status_log();

-- ============================================================================
-- ADD FUNNEL/MATRIX DATA ASSETS
-- ============================================================================

INSERT INTO data_assets (asset_key, display_name, description, category, synonyms, output_shapes, available_dimensions, available_filters, metadata)
VALUES
  ('submission_funnel', 'Submission Pipeline Funnel', 'Tracks submissions through pipeline stages', 'pipeline',
   ARRAY['funnel', 'pipeline', 'conversion', 'submissions pipeline'],
   ARRAY['funnel_stages', 'single_value']::text[],
   ARRAY['consultant', 'team']::text[],
   ARRAY['date_range', 'consultant']::text[],
   '{"source_table": "submission_status_log"}'::jsonb),
  ('activity_heatmap', 'Activity Heatmap', 'Cross-tabulation of consultants vs activity types', 'activity',
   ARRAY['heatmap', 'matrix', 'activity matrix', 'activity grid'],
   ARRAY['matrix']::text[],
   ARRAY['consultant', 'activity_type']::text[],
   ARRAY['date_range']::text[],
   '{"source_table": "activities"}'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFY
-- ============================================================================

DO $$
DECLARE
  target_count INT;
  funnel_count INT;
BEGIN
  SELECT COUNT(*) INTO target_count FROM consultant_targets WHERE metadata->>'seed_data' = 'true';
  SELECT COUNT(*) INTO funnel_count FROM submission_status_log WHERE metadata->>'seed_data' = 'true';

  RAISE NOTICE '=== Widget Test Data Summary ===';
  RAISE NOTICE 'Consultant targets: %', target_count;
  RAISE NOTICE 'Submission status log entries: %', funnel_count;
END $$;
