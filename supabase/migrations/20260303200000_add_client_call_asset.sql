-- Add combined Client Calls data asset (BD Call + AD Call + AM Call)
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('client_call_count', 'Client Calls', 'All client-facing calls including BD, AD, and AM calls',
 ARRAY['client calls', 'BD calls', 'AD calls', 'AM calls', 'business development calls', 'account calls'],
 'activity',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range'],
 '{"source_table": "activities", "activity_types": ["BD Call", "AD Call", "AM Call"]}'::jsonb);
