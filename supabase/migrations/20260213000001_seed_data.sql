-- ============================================================================
-- Potentia Certus: Seed Data
-- Created: 2026-02-13
--
-- Seeds:
-- - Org hierarchy (National → 4 Regions → 8 Teams)
-- - Initial business rules
-- - Core data assets for AI queries
-- ============================================================================

-- ============================================================================
-- 1. ORG HIERARCHY
-- ============================================================================

-- National Level
INSERT INTO org_hierarchy (id, parent_id, hierarchy_level, name, is_sales_team, metadata) VALUES
('00000000-0000-0000-0000-000000000001', NULL, 'national', 'Potentia Group NZ', true, '{"description": "National organization"}'::jsonb);

-- Regional Level (4 regions)
INSERT INTO org_hierarchy (id, parent_id, hierarchy_level, name, is_sales_team, metadata) VALUES
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'region', 'Auckland', true, '{"description": "Auckland region"}'::jsonb),
('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'region', 'Wellington', true, '{"description": "Wellington region"}'::jsonb),
('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'region', 'Christchurch', true, '{"description": "Christchurch region"}'::jsonb),
('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001', 'region', 'Dunedin', true, '{"description": "Dunedin region"}'::jsonb);

-- Team Level (2 teams per region = 8 teams total)
-- Auckland teams
INSERT INTO org_hierarchy (id, parent_id, hierarchy_level, name, is_sales_team, metadata) VALUES
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', 'team', 'Auckland Perm', true, '{"team_type": "permanent"}'::jsonb),
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000010', 'team', 'Auckland Contract', true, '{"team_type": "contract"}'::jsonb);

-- Wellington teams
INSERT INTO org_hierarchy (id, parent_id, hierarchy_level, name, is_sales_team, metadata) VALUES
('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000020', 'team', 'Wellington Perm', true, '{"team_type": "permanent"}'::jsonb),
('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000020', 'team', 'Wellington Contract', true, '{"team_type": "contract"}'::jsonb);

-- Christchurch teams
INSERT INTO org_hierarchy (id, parent_id, hierarchy_level, name, is_sales_team, metadata) VALUES
('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000030', 'team', 'Christchurch Perm', true, '{"team_type": "permanent"}'::jsonb),
('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000030', 'team', 'Christchurch Contract', true, '{"team_type": "contract"}'::jsonb);

-- Dunedin teams
INSERT INTO org_hierarchy (id, parent_id, hierarchy_level, name, is_sales_team, metadata) VALUES
('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000040', 'team', 'Dunedin Perm', true, '{"team_type": "permanent"}'::jsonb),
('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000040', 'team', 'Dunedin Contract', true, '{"team_type": "contract"}'::jsonb);

-- Optopi (Operations team - NOT sales, excluded from metrics)
INSERT INTO org_hierarchy (id, parent_id, hierarchy_level, name, is_sales_team, metadata) VALUES
('00000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000001', 'team', 'Optopi', false, '{"team_type": "operations", "description": "Operations support team (not sales)"}'::jsonb);

-- ============================================================================
-- 2. BUSINESS RULES (already seeded in migration, adding more here)
-- ============================================================================

-- Target thresholds
INSERT INTO business_rules (rule_type, rule_key, rule_value, effective_from, description) VALUES
('target_threshold', 'green_threshold', '{"percentage": 100}'::jsonb, '2026-01-01', 'Green performance: >= 100% of target'),
('target_threshold', 'amber_threshold', '{"percentage": 80}'::jsonb, '2026-01-01', 'Amber performance: 80-99% of target'),
('target_threshold', 'red_threshold', '{"percentage": 0}'::jsonb, '2026-01-01', 'Red performance: < 80% of target');

-- Contract hours standard
INSERT INTO business_rules (rule_type, rule_key, rule_value, effective_from, description) VALUES
('contract_calculation', 'standard_hours_per_day', '{"hours": 8}'::jsonb, '2026-01-01', 'Standard contract hours: 8 hours per day for revenue calculation');

-- ============================================================================
-- 3. DATA ASSETS (Core measures for AI natural language queries)
-- ============================================================================

-- Activity Metrics
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('submittal_count', 'Submittals', 'Number of candidate submittals', ARRAY['subs', 'CVs sent', 'candidates submitted', 'submissions'], 'pipeline', ARRAY['single_value', 'time_series', 'categorical'], ARRAY['time', 'consultant', 'team', 'region'], ARRAY['date_range', 'status'], '{"source_table": "submission_status_log", "status_filter": "Submittal"}'::jsonb),
('placement_count', 'Placements', 'Number of successful placements', ARRAY['placements', 'fills', 'hires'], 'pipeline', ARRAY['single_value', 'time_series', 'categorical'], ARRAY['time', 'consultant', 'team', 'region', 'employment_type'], ARRAY['date_range', 'employment_type'], '{"source_table": "placements"}'::jsonb),
('job_order_count', 'Job Orders', 'Number of active job orders', ARRAY['jobs', 'reqs', 'requisitions', 'JOs'], 'pipeline', ARRAY['single_value', 'time_series', 'categorical'], ARRAY['time', 'consultant', 'team', 'region', 'employment_type'], ARRAY['date_range', 'status', 'employment_type'], '{"source_table": "job_orders"}'::jsonb),
('strategic_referral_count', 'Strategic Referrals', 'Number of strategic referrals', ARRAY['referrals', 'strategic refs'], 'activity', ARRAY['single_value', 'time_series', 'categorical'], ARRAY['time', 'consultant', 'team', 'region'], ARRAY['date_range'], '{"source_table": "strategic_referrals"}'::jsonb);

-- Revenue Metrics
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('placement_revenue_perm', 'Permanent Placement Revenue', 'Revenue from permanent placements', ARRAY['perm revenue', 'permanent fees', 'perm billing'], 'revenue', ARRAY['single_value', 'time_series', 'categorical'], ARRAY['time', 'consultant', 'team', 'region'], ARRAY['date_range'], '{"source_table": "placements", "revenue_type": "permanent", "field": "fee_amount"}'::jsonb),
('placement_revenue_contract', 'Contract Placement Revenue', 'Revenue from contract placements', ARRAY['contract revenue', 'contract GP', 'contract billing'], 'revenue', ARRAY['single_value', 'time_series', 'categorical'], ARRAY['time', 'consultant', 'team', 'region'], ARRAY['date_range'], '{"source_table": "placements", "revenue_type": "contract", "calculation": "gp_per_hour × 8 × duration"}'::jsonb),
('blended_revenue', 'Blended Revenue', 'Normalized revenue (perm + contract with 1000x multiplier)', ARRAY['total revenue', 'combined revenue', 'normalized revenue'], 'revenue', ARRAY['single_value', 'time_series', 'categorical'], ARRAY['time', 'consultant', 'team', 'region'], ARRAY['date_range'], '{"calculation": "perm_fee_amount + (contract_revenue / 1000)"}'::jsonb);

-- Performance Metrics
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('target_attainment', 'Target Attainment', 'Percentage of target achieved', ARRAY['target %', 'goal attainment', 'quota attainment'], 'performance', ARRAY['single_value', 'categorical'], ARRAY['consultant', 'team', 'region'], ARRAY['date_range', 'target_type'], '{"calculation": "(actual / target) × 100"}'::jsonb),
('conversion_rate_submittal_to_interview', 'Submittal to Interview Rate', 'Percentage of submittals that reach interview', ARRAY['interview conversion', 'sub to interview'], 'performance', ARRAY['single_value', 'time_series'], ARRAY['time', 'consultant', 'team', 'region'], ARRAY['date_range'], '{"calculation": "(interviews / submittals) × 100"}'::jsonb),
('conversion_rate_interview_to_offer', 'Interview to Offer Rate', 'Percentage of interviews that receive offers', ARRAY['offer conversion', 'interview to offer'], 'performance', ARRAY['single_value', 'time_series'], ARRAY['time', 'consultant', 'team', 'region'], ARRAY['date_range'], '{"calculation": "(offers / interviews) × 100"}'::jsonb),
('conversion_rate_offer_to_placement', 'Offer to Placement Rate', 'Percentage of offers that become placements', ARRAY['placement conversion', 'offer acceptance rate'], 'performance', ARRAY['single_value', 'time_series'], ARRAY['time', 'consultant', 'team', 'region'], ARRAY['date_range'], '{"calculation": "(placements / offers) × 100"}'::jsonb);

-- Pipeline Stage Metrics
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('interview_count', 'Interviews', 'Number of candidate interviews', ARRAY['interviews', 'client interviews'], 'pipeline', ARRAY['single_value', 'time_series', 'categorical'], ARRAY['time', 'consultant', 'team', 'region'], ARRAY['date_range', 'interview_stage'], '{"source_table": "submission_status_log", "status_filter": ["Client Interview 1", "Client Interview 2", "Client Interview Final"]}'::jsonb),
('offer_count', 'Offers Extended', 'Number of offers extended', ARRAY['offers', 'offer extended'], 'pipeline', ARRAY['single_value', 'time_series', 'categorical'], ARRAY['time', 'consultant', 'team', 'region'], ARRAY['date_range'], '{"source_table": "submission_status_log", "status_filter": "Offer Extended"}'::jsonb);

-- Leaderboard Metrics
INSERT INTO data_assets (asset_key, display_name, description, synonyms, category, output_shapes, available_dimensions, available_filters, metadata) VALUES
('leaderboard_revenue', 'Revenue Leaderboard', 'Consultant ranking by blended revenue', ARRAY['top billers', 'revenue ranking'], 'performance', ARRAY['categorical'], ARRAY['consultant'], ARRAY['date_range', 'limit'], '{"sort": "blended_revenue DESC", "default_limit": 10}'::jsonb),
('leaderboard_placements', 'Placements Leaderboard', 'Consultant ranking by placement count', ARRAY['top performers', 'placement ranking'], 'performance', ARRAY['categorical'], ARRAY['consultant'], ARRAY['date_range', 'limit'], '{"sort": "placement_count DESC", "default_limit": 10}'::jsonb);

-- ============================================================================
-- 4. CONTEXT DOCUMENTS (Placeholders for AI system prompt)
-- ============================================================================

INSERT INTO context_documents (document_type, title, content, is_active) VALUES
('business_vernacular', 'Business Vernacular & Terminology',
'# Business Vernacular

## Common Terms
- **Subs / CVs**: Submittals (candidate submissions to clients)
- **JO**: Job Order (requisition)
- **Perm**: Permanent placement
- **Contract**: Contract/temporary placement
- **GP**: Gross Profit
- **BD**: Business Development

## Status Terms
- **Submittal**: Candidate submitted to client
- **Client Interview 1/2/Final**: Interview stages
- **Offer Extended**: Job offer made to candidate
- **Placed**: Successful placement (candidate accepted offer and started)

*(This document should be expanded with actual team terminology)*',
true);

INSERT INTO context_documents (document_type, title, content, is_active) VALUES
('leading_lagging_indicators', 'Leading vs Lagging Indicators',
'# Leading vs Lagging Indicators

## Leading Indicators (Predictive)
- Sales calls
- Meetings with clients
- Job orders created
- Submittals
- Interviews scheduled

## Lagging Indicators (Results)
- Placements
- Revenue
- Offer acceptance rate

## Pipeline Velocity
Typical timeframes:
- Sales call → Job order: 2-4 weeks
- Submittal → Interview: 3-7 days
- Interview → Offer: 1-2 weeks
- Offer → Placement: 1-4 weeks

*(This document should be expanded with actual pipeline data)*',
true);

INSERT INTO context_documents (document_type, title, content, is_active) VALUES
('motivation_framework', 'Motivation Framework',
'# What Motivates Different Roles

## Consultants
- Individual placement counts
- Personal revenue
- Ranking on leaderboards
- Conversion rates (quality of submissions)

## Team Leads
- Team performance vs targets
- Team member development
- Team ranking vs other teams

## Managers
- Regional performance
- Revenue targets
- Strategic metrics (market coverage, client retention)

## Gamification Elements
- Leaderboards (monthly, quarterly)
- Streaks (consecutive placements)
- Milestones (first placement, 10th placement, etc.)

*(This document should be expanded with actual motivation insights)*',
true);

INSERT INTO context_documents (document_type, title, content, is_active) VALUES
('metric_relationships', 'Metric Relationships',
'# How Metrics Relate to Each Other

## Causal Relationships
- More sales calls → More job orders (2-4 week lag)
- More job orders → More submittals opportunity
- Higher quality submittals → Higher interview conversion rate
- More strategic referrals → Higher placement success rate

## Key Ratios
- Submittals per job order: Target 3-5
- Interview rate: Target 30-40% of submittals
- Offer rate: Target 50-70% of final interviews
- Placement rate: Target 80-90% of offers

## Revenue Blending
- Contract GP per hour × 1000 = Equivalent perm billing
- Used for fair comparison between perm and contract teams

*(This document should be expanded with actual metric relationships)*',
true);

-- ============================================================================
-- SEED DATA COMPLETE
-- ============================================================================
