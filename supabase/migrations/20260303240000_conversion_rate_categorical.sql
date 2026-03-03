-- ============================================================================
-- Add categorical shape to conversion rate assets
-- ============================================================================
-- Enables per-consultant conversion rate leaderboards.
-- Adds machine-readable numerator/denominator status arrays so the query engine
-- can compute actual ratios instead of just counting rows.
-- min_sample_size prevents misleading percentages from small samples.
-- ============================================================================

-- Submittal → Interview
UPDATE data_assets
SET
  output_shapes = ARRAY['single_value', 'time_series', 'categorical'],
  metadata = jsonb_build_object(
    'calculation', '(interviews / submittals) x 100',
    'source_table', 'submission_status_log',
    'denominator_statuses', jsonb_build_array('Submittal'),
    'numerator_statuses', jsonb_build_array('Client Interview 1', 'Client Interview 2', 'Client Interview Final'),
    'min_sample_size', 5
  )
WHERE asset_key = 'conversion_rate_submittal_to_interview';

-- Interview → Offer
UPDATE data_assets
SET
  output_shapes = ARRAY['single_value', 'time_series', 'categorical'],
  metadata = jsonb_build_object(
    'calculation', '(offers / interviews) x 100',
    'source_table', 'submission_status_log',
    'denominator_statuses', jsonb_build_array('Client Interview 1', 'Client Interview 2', 'Client Interview Final'),
    'numerator_statuses', jsonb_build_array('Offer Extended'),
    'min_sample_size', 5
  )
WHERE asset_key = 'conversion_rate_interview_to_offer';

-- Offer → Placement
UPDATE data_assets
SET
  output_shapes = ARRAY['single_value', 'time_series', 'categorical'],
  metadata = jsonb_build_object(
    'calculation', '(placements / offers) x 100',
    'source_table', 'submission_status_log',
    'denominator_statuses', jsonb_build_array('Offer Extended'),
    'numerator_statuses', jsonb_build_array('Placed'),
    'min_sample_size', 5
  )
WHERE asset_key = 'conversion_rate_offer_to_placement';
