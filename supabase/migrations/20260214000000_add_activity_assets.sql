-- ============================================================================
-- Add Sales Activity Data Assets
-- Created: 2026-02-14
--
-- Adds 12 activity tracking data assets based on actual Bullhorn activity types
-- Covers 97% of all activity volume (35,151 out of 36,263 activities)
-- ============================================================================

-- ============================================================================
-- CLIENT/BD ACTIVITIES (4 assets)
-- ============================================================================

-- BD Calls
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('bd_call_count', 'BD Calls', 'Business development calls to prospective clients',
 ARRAY['BD calls', 'business development', 'new business calls', 'prospecting calls', 'VD calls'],
 'activity',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range'],
 '{"source_table": "activities", "activity_types": ["BD Call"], "annual_volume": 594, "unique_consultants": 22}'::jsonb);

-- AD Calls (includes AM Calls)
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('ad_call_count', 'AD/AM Calls', 'Account development and account management calls to existing clients',
 ARRAY['AD calls', 'AM calls', 'account development', 'account management', 'client calls', 'account calls'],
 'activity',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range'],
 '{"source_table": "activities", "activity_types": ["AD Call", "AM Call"], "annual_volume": 3951, "unique_consultants": 24}'::jsonb);

-- BD Meetings
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('bd_meeting_count', 'BD Meetings', 'Business development meetings with prospective clients',
 ARRAY['BD meetings', 'business development meetings', 'prospecting meetings', 'new business meetings'],
 'activity',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range'],
 '{"source_table": "activities", "activity_types": ["BD Meeting"], "annual_volume": 447, "unique_consultants": 19}'::jsonb);

-- Client Meetings
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('client_meeting_count', 'Client Meetings', 'Face-to-face meetings and coffee catch-ups with clients',
 ARRAY['client meetings', 'client catch-ups', 'coffee with clients', 'client face-to-face'],
 'activity',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range'],
 '{"source_table": "activities", "activity_types": ["Coffee Catch Up - Client"], "annual_volume": 1275, "unique_consultants": 23}'::jsonb);

-- ============================================================================
-- CANDIDATE ACTIVITIES (4 assets)
-- ============================================================================

-- Candidate Calls
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('candidate_call_count', 'Candidate Calls', 'All candidate phone outreach including connects, follow-ups, screening, and headhunting',
 ARRAY['candidate calls', 'candidate connects', 'candidate follow-ups', 'screening calls', 'headhunt calls', 'LMTCB'],
 'activity',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range'],
 '{"source_table": "activities", "activity_types": ["Candidate Connect/Follow Up", "LMTCB", "Candidate Screening Call", "Headhunt Call"], "annual_volume": 23364, "unique_consultants": 31}'::jsonb);

-- Candidate Meetings
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('candidate_meeting_count', 'Candidate Meetings', 'Face-to-face meetings with candidates including coffee catch-ups and interviews',
 ARRAY['candidate meetings', 'candidate catch-ups', 'coffee with candidates', 'consultant interviews'],
 'activity',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range'],
 '{"source_table": "activities", "activity_types": ["Coffee Catch Up - Candidate", "Consultant Interview"], "annual_volume": 2249, "unique_consultants": 28}'::jsonb);

-- Interview Feedback
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('interview_feedback_count', 'Interview Feedback', 'Post-interview feedback calls with candidates',
 ARRAY['interview feedback', 'feedback calls', 'interview debriefs'],
 'activity',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range'],
 '{"source_table": "activities", "activity_types": ["Interview Feedback"], "annual_volume": 460, "unique_consultants": 18}'::jsonb);

-- Reference Checks
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('reference_check_count', 'Reference Checks', 'Reference check calls for candidates',
 ARRAY['reference checks', 'reference calls', 'references'],
 'activity',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range'],
 '{"source_table": "activities", "activity_types": ["Reference Check Call"], "annual_volume": 243, "unique_consultants": 15}'::jsonb);

-- ============================================================================
-- DIGITAL OUTREACH (3 assets)
-- ============================================================================

-- Email Outreach
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('email_outreach_count', 'Email Outreach', 'Email connections and job board updates',
 ARRAY['emails', 'email connects', 'LI updates', 'Seek updates', 'job board updates'],
 'activity',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range'],
 '{"source_table": "activities", "activity_types": ["Email Connect", "LI/Seek Update"], "annual_volume": 1034, "unique_consultants": 25}'::jsonb);

-- LinkedIn InMails
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('linkedin_inmail_count', 'LinkedIn InMails', 'LinkedIn InMail outreach to candidates and clients',
 ARRAY['LinkedIn', 'InMails', 'LI InMails', 'social recruiting'],
 'activity',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range'],
 '{"source_table": "activities", "activity_types": ["LinkedIn InMail"], "annual_volume": 186, "unique_consultants": 18}'::jsonb);

-- SMS Outreach
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('sms_outreach_count', 'SMS Outreach', 'Text message outreach to candidates',
 ARRAY['SMS', 'texts', 'TXT connects', 'text messages', 'mobile outreach'],
 'activity',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range'],
 '{"source_table": "activities", "activity_types": ["TXT Connect"], "annual_volume": 337, "unique_consultants": 26}'::jsonb);

-- ============================================================================
-- POST-PLACEMENT (1 asset)
-- ============================================================================

-- Post-Placement Check-ins
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('post_placement_checkin_count', 'Post-Placement Check-ins', 'Follow-up calls with placed candidates for retention and satisfaction',
 ARRAY['post placement', 'placement check-ins', 'retention calls', 'satisfaction checks'],
 'activity',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range'],
 '{"source_table": "activities", "activity_types": ["Post Placement Check In"], "annual_volume": 292, "unique_consultants": 22}'::jsonb);

-- ============================================================================
-- AGGREGATE ACTIVITY METRICS (Optional - for convenience)
-- ============================================================================

-- Total Activity Count (all activities)
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('total_activity_count', 'Total Activity', 'Total count of all logged activities',
 ARRAY['all activities', 'total touches', 'activity count', 'total activity'],
 'activity',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range', 'activity_type'],
 '{"source_table": "activities", "calculation": "COUNT(*)", "annual_volume": 36263}'::jsonb);

-- Client Touch Points (aggregate)
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('client_touch_count', 'Client Touch Points', 'Total client-facing activities (BD + AD + meetings)',
 ARRAY['client touches', 'client activities', 'client engagement'],
 'activity',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range'],
 '{"source_table": "activities", "activity_types": ["BD Call", "AD Call", "AM Call", "BD Meeting", "Coffee Catch Up - Client"], "annual_volume": 6267}'::jsonb);

-- Candidate Touch Points (aggregate)
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('candidate_touch_count', 'Candidate Touch Points', 'Total candidate-facing activities (calls + meetings)',
 ARRAY['candidate touches', 'candidate activities', 'candidate engagement'],
 'activity',
 ARRAY['single_value', 'time_series', 'categorical'],
 ARRAY['time', 'consultant', 'team', 'region'],
 ARRAY['date_range'],
 '{"source_table": "activities", "activity_types": ["Candidate Connect/Follow Up", "LMTCB", "Candidate Screening Call", "Headhunt Call", "Coffee Catch Up - Candidate", "Consultant Interview"], "annual_volume": 25613}'::jsonb);

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Total new data assets added: 15
-- - 4 client/BD activities
-- - 4 candidate activities
-- - 3 digital outreach
-- - 1 post-placement
-- - 3 aggregate metrics
--
-- Coverage: 35,151 activities out of 36,263 total (97%)
-- Remaining 3%: Pipeline stages and rejection statuses (already tracked elsewhere)
