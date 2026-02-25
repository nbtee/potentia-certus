-- Purge seed data that was inserted by development seed migrations.
-- These rows are tagged with metadata->>'seed_data' = 'true' and are now
-- mixed with real Bullhorn-synced data, inflating widget counts.

-- Remove seed activities (~600 rows, 1.7% of total)
DELETE FROM activities WHERE metadata->>'seed_data' = 'true';

-- Remove seed submission_status_log (308 rows, 9.3% of total)
DELETE FROM submission_status_log WHERE metadata->>'seed_data' = 'true';

-- Remove seed consultant_targets
DELETE FROM consultant_targets WHERE metadata->>'seed_data' = 'true';
