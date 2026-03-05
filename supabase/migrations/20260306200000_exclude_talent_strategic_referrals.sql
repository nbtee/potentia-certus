-- Exclude talent management users from strategic referral counts.
-- Strategic referrals are a sales metric; talent managers also record them
-- but they should not count toward the sales KPI.
UPDATE data_assets
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{exclude_titles}',
  '["talent_manager", "senior_talent_manager", "talent_delivery_lead"]'::jsonb
)
WHERE asset_key = 'strategic_referral_count';
