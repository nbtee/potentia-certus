-- ============================================================================
-- Seed Activity Data
-- Created: 2026-02-16
--
-- Seeds realistic activity data for testing widgets using existing auth users
-- - ~600 activities over last 90 days
-- - Mix of activity types (calls, meetings, emails)
-- - Distributed across existing user_profiles
-- ============================================================================

-- ============================================================================
-- SEED ACTIVITIES (Last 90 days, distributed across existing users)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_seed_activities() RETURNS void AS $$
DECLARE
  user_ids UUID[];
  activity_types TEXT[] := ARRAY[
    'Candidate Connect/Follow Up',
    'LMTCB',
    'Candidate Screening Call',
    'BD Call',
    'AD Call',
    'AM Call',
    'BD Meeting',
    'Coffee Catch Up - Client',
    'Coffee Catch Up - Candidate',
    'Consultant Interview',
    'Email Connect',
    'LinkedIn InMail',
    'TXT Connect',
    'Interview Feedback',
    'Reference Check Call',
    'Post Placement Check In'
  ];

  -- Activity weights (higher = more frequent)
  activity_weights INT[] := ARRAY[40, 20, 15, 5, 15, 10, 3, 5, 8, 6, 8, 2, 4, 5, 3, 2];

  base_date DATE := CURRENT_DATE - INTERVAL '90 days';
  activity_date DATE;
  consultant_id UUID;
  activity_type TEXT;
  daily_activities INT;
  i INT;
  j INT;
  k INT;
  total_weight INT;
  random_weight INT;
  cumulative_weight INT;
  user_count INT;
BEGIN
  -- Get all existing user_profile IDs
  SELECT array_agg(id) INTO user_ids FROM user_profiles;
  user_count := array_length(user_ids, 1);

  IF user_count IS NULL OR user_count = 0 THEN
    RAISE NOTICE 'No user profiles found. Please create a user first.';
    RETURN;
  END IF;

  RAISE NOTICE 'Generating seed activities for % user(s)', user_count;

  -- Calculate total weight for weighted random selection
  total_weight := 0;
  FOREACH i IN ARRAY activity_weights LOOP
    total_weight := total_weight + i;
  END LOOP;

  -- Generate activities for each day in the last 90 days
  FOR i IN 0..89 LOOP
    activity_date := base_date + (i || ' days')::INTERVAL;

    -- Skip weekends (reduce activity by 90%)
    IF EXTRACT(DOW FROM activity_date) IN (0, 6) THEN
      daily_activities := 1 + floor(random() * 2)::INT;
    ELSE
      -- Weekdays: 6-10 activities per day total
      daily_activities := 6 + floor(random() * 5)::INT;
    END IF;

    -- Generate activities for this day
    FOR j IN 1..daily_activities LOOP
      -- Randomly select from existing users
      consultant_id := user_ids[1 + floor(random() * user_count)::INT];

      -- Weighted random selection of activity type
      random_weight := 1 + floor(random() * total_weight)::INT;
      cumulative_weight := 0;

      FOR k IN 1..array_length(activity_types, 1) LOOP
        cumulative_weight := cumulative_weight + activity_weights[k];
        IF random_weight <= cumulative_weight THEN
          activity_type := activity_types[k];
          EXIT;
        END IF;
      END LOOP;

      -- Insert activity
      INSERT INTO activities (
        bullhorn_id,
        activity_type,
        consultant_id,
        activity_date,
        created_at,
        metadata
      ) VALUES (
        (1000000 + (i * 100) + j)::BIGINT, -- Unique bullhorn_id
        activity_type,
        consultant_id,
        activity_date,
        activity_date + (floor(random() * 12)::INT || ' hours')::INTERVAL,
        jsonb_build_object(
          'seed_data', true,
          'day_of_week', EXTRACT(DOW FROM activity_date),
          'generated_at', NOW()
        )
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Successfully generated % seed activities', (SELECT COUNT(*) FROM activities WHERE metadata->>'seed_data' = 'true');
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT generate_seed_activities();

-- Drop the function (cleanup)
DROP FUNCTION generate_seed_activities();

-- ============================================================================
-- VERIFY SEED DATA
-- ============================================================================

DO $$
DECLARE
  total_count INT;
  type_count INT;
  date_range TEXT;
BEGIN
  SELECT COUNT(*), COUNT(DISTINCT activity_type)
  INTO total_count, type_count
  FROM activities
  WHERE metadata->>'seed_data' = 'true';

  SELECT
    MIN(activity_date)::TEXT || ' to ' || MAX(activity_date)::TEXT
  INTO date_range
  FROM activities
  WHERE metadata->>'seed_data' = 'true';

  RAISE NOTICE '=== Seed Data Summary ===';
  RAISE NOTICE 'Total activities: %', total_count;
  RAISE NOTICE 'Unique activity types: %', type_count;
  RAISE NOTICE 'Date range: %', date_range;
END $$;
