-- Add first-round client-candidate interview data asset
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('first_interview_count', 'First Interviews', 'Number of first-round client-candidate interviews',
 ARRAY['first interviews', '1st interviews', 'client interview 1', 'first round interviews'],
 'pipeline',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range'],
 '{"source_table": "submission_status_log", "status_filter": "Client Interview 1"}'::jsonb);
