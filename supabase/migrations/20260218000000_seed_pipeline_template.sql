-- ============================================================================
-- Seed Pipeline Dashboard Template
-- Created: 2026-02-18
--
-- Creates a template dashboard matching the hardcoded Stage C demo layout.
-- Users can "Create from Template" to get a pre-configured dashboard.
-- ============================================================================

DO $$
DECLARE
  tmpl_id UUID;
  w_id UUID;
  -- Data asset IDs
  da_candidate_call UUID;
  da_candidate_meeting UUID;
  da_bd_call UUID;
  da_ad_call UUID;
  da_client_meeting UUID;
  da_reference_check UUID;
  da_activity_heatmap UUID;
BEGIN
  -- Look up data asset IDs
  SELECT id INTO da_candidate_call FROM data_assets WHERE asset_key = 'candidate_call_count';
  SELECT id INTO da_candidate_meeting FROM data_assets WHERE asset_key = 'candidate_meeting_count';
  SELECT id INTO da_bd_call FROM data_assets WHERE asset_key = 'bd_call_count';
  SELECT id INTO da_ad_call FROM data_assets WHERE asset_key = 'ad_call_count';
  SELECT id INTO da_client_meeting FROM data_assets WHERE asset_key = 'client_meeting_count';
  SELECT id INTO da_reference_check FROM data_assets WHERE asset_key = 'reference_check_count';
  SELECT id INTO da_activity_heatmap FROM data_assets WHERE asset_key = 'activity_heatmap';

  -- Only proceed if we have the required data assets
  IF da_candidate_call IS NULL THEN
    RAISE NOTICE 'Required data assets not found, skipping template creation';
    RETURN;
  END IF;

  -- Create template dashboard
  INSERT INTO dashboards (name, description, layout, is_template, is_shared, owner_id)
  VALUES (
    'Activity Pipeline',
    'Pre-built activity dashboard with KPIs, charts, leaderboard, and heatmap',
    '[]'::jsonb,
    true,
    true,
    -- Use the first admin user, or fall back to any user
    COALESCE(
      (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1),
      (SELECT id FROM user_profiles LIMIT 1),
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  )
  RETURNING id INTO tmpl_id;

  -- ============================================================================
  -- KPI Cards (Row 1: y=0, h=2)
  -- ============================================================================

  -- Candidate Calls KPI
  INSERT INTO dashboard_widgets (dashboard_id, data_asset_id, widget_type, parameters, widget_config, position)
  VALUES (tmpl_id, da_candidate_call, 'kpi_card', '{}'::jsonb,
    '{"icon": "phone", "colorScheme": "blue"}'::jsonb,
    '{"x": 0, "y": 0, "w": 3, "h": 2}'::jsonb)
  RETURNING id INTO w_id;

  -- Candidate Meetings KPI
  INSERT INTO dashboard_widgets (dashboard_id, data_asset_id, widget_type, parameters, widget_config, position)
  VALUES (tmpl_id, da_candidate_meeting, 'kpi_card', '{}'::jsonb,
    '{"icon": "users", "colorScheme": "green"}'::jsonb,
    '{"x": 3, "y": 0, "w": 3, "h": 2}'::jsonb)
  RETURNING id INTO w_id;

  -- BD Calls KPI
  INSERT INTO dashboard_widgets (dashboard_id, data_asset_id, widget_type, parameters, widget_config, position)
  VALUES (tmpl_id, da_bd_call, 'kpi_card', '{}'::jsonb,
    '{"icon": "trending_up", "colorScheme": "purple"}'::jsonb,
    '{"x": 6, "y": 0, "w": 3, "h": 2}'::jsonb)
  RETURNING id INTO w_id;

  -- AD Calls KPI
  INSERT INTO dashboard_widgets (dashboard_id, data_asset_id, widget_type, parameters, widget_config, position)
  VALUES (tmpl_id, da_ad_call, 'kpi_card', '{}'::jsonb,
    '{"icon": "phone", "colorScheme": "blue"}'::jsonb,
    '{"x": 9, "y": 0, "w": 3, "h": 2}'::jsonb)
  RETURNING id INTO w_id;

  -- ============================================================================
  -- Target Gauges (Row 2: y=2, h=3)
  -- ============================================================================

  -- Candidate Call Target
  INSERT INTO dashboard_widgets (dashboard_id, data_asset_id, widget_type, parameters, widget_config, position)
  VALUES (tmpl_id, da_candidate_call, 'target_gauge', '{}'::jsonb,
    '{"title": "Candidate Call Target", "targetValue": 200, "targetLabel": "Monthly Target"}'::jsonb,
    '{"x": 0, "y": 2, "w": 3, "h": 3}'::jsonb)
  RETURNING id INTO w_id;

  -- BD Call Target
  INSERT INTO dashboard_widgets (dashboard_id, data_asset_id, widget_type, parameters, widget_config, position)
  VALUES (tmpl_id, da_bd_call, 'target_gauge', '{}'::jsonb,
    '{"title": "BD Call Target", "targetValue": 50, "targetLabel": "Monthly Target"}'::jsonb,
    '{"x": 3, "y": 2, "w": 3, "h": 3}'::jsonb)
  RETURNING id INTO w_id;

  -- Meeting Target
  INSERT INTO dashboard_widgets (dashboard_id, data_asset_id, widget_type, parameters, widget_config, position)
  VALUES (tmpl_id, da_candidate_meeting, 'target_gauge', '{}'::jsonb,
    '{"title": "Meeting Target", "targetValue": 30, "targetLabel": "Monthly Target"}'::jsonb,
    '{"x": 6, "y": 2, "w": 3, "h": 3}'::jsonb)
  RETURNING id INTO w_id;

  -- Client Meeting Target
  INSERT INTO dashboard_widgets (dashboard_id, data_asset_id, widget_type, parameters, widget_config, position)
  VALUES (tmpl_id, da_client_meeting, 'target_gauge', '{}'::jsonb,
    '{"title": "Client Meeting Target", "targetValue": 20, "targetLabel": "Monthly Target"}'::jsonb,
    '{"x": 9, "y": 2, "w": 3, "h": 3}'::jsonb)
  RETURNING id INTO w_id;

  -- ============================================================================
  -- Time Series Charts (Row 3: y=5, h=4)
  -- ============================================================================

  -- Candidate Call Activity
  INSERT INTO dashboard_widgets (dashboard_id, data_asset_id, widget_type, parameters, widget_config, position)
  VALUES (tmpl_id, da_candidate_call, 'time_series_chart', '{}'::jsonb,
    '{"title": "Candidate Call Activity", "chartType": "area", "color": "#3b82f6"}'::jsonb,
    '{"x": 0, "y": 5, "w": 6, "h": 4}'::jsonb)
  RETURNING id INTO w_id;

  -- BD Calls
  INSERT INTO dashboard_widgets (dashboard_id, data_asset_id, widget_type, parameters, widget_config, position)
  VALUES (tmpl_id, da_bd_call, 'time_series_chart', '{}'::jsonb,
    '{"title": "Business Development Calls", "chartType": "area", "color": "#8b5cf6"}'::jsonb,
    '{"x": 6, "y": 5, "w": 6, "h": 4}'::jsonb)
  RETURNING id INTO w_id;

  -- ============================================================================
  -- Bar Chart + Leaderboard (Row 4: y=9, h=5)
  -- ============================================================================

  -- Top Performers Bar
  INSERT INTO dashboard_widgets (dashboard_id, data_asset_id, widget_type, parameters, widget_config, position)
  VALUES (tmpl_id, da_candidate_call, 'bar_chart',
    '{"dimension": "consultant", "limit": 8}'::jsonb,
    '{"title": "Top Performers: Candidate Calls", "orientation": "vertical", "color": "#3b82f6"}'::jsonb,
    '{"x": 0, "y": 9, "w": 6, "h": 5}'::jsonb)
  RETURNING id INTO w_id;

  -- Leaderboard
  INSERT INTO dashboard_widgets (dashboard_id, data_asset_id, widget_type, parameters, widget_config, position)
  VALUES (tmpl_id, da_candidate_call, 'leaderboard',
    '{"limit": 8}'::jsonb,
    '{"title": "Candidate Call Leaderboard"}'::jsonb,
    '{"x": 6, "y": 9, "w": 6, "h": 5}'::jsonb)
  RETURNING id INTO w_id;

  -- ============================================================================
  -- Heatmap (Row 5: y=14, h=5)
  -- ============================================================================

  INSERT INTO dashboard_widgets (dashboard_id, data_asset_id, widget_type, parameters, widget_config, position)
  VALUES (tmpl_id, COALESCE(da_activity_heatmap, da_candidate_call), 'heatmap', '{}'::jsonb,
    '{"title": "Activity Heatmap: Consultants vs Activity Types", "height": 400}'::jsonb,
    '{"x": 0, "y": 14, "w": 12, "h": 5}'::jsonb)
  RETURNING id INTO w_id;

  -- ============================================================================
  -- Rebuild layout array from all inserted widgets
  -- ============================================================================

  UPDATE dashboards
  SET layout = (
    SELECT jsonb_agg(
      jsonb_build_object(
        'i', dw.id::text,
        'x', (dw.position->>'x')::int,
        'y', (dw.position->>'y')::int,
        'w', (dw.position->>'w')::int,
        'h', (dw.position->>'h')::int
      )
    )
    FROM dashboard_widgets dw
    WHERE dw.dashboard_id = tmpl_id
  )
  WHERE id = tmpl_id;

  RAISE NOTICE 'Created Activity Pipeline template with ID: %', tmpl_id;
END $$;
