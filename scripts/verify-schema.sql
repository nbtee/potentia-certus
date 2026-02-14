-- ============================================================================
-- Schema Verification Script
-- Validates that Phase 1 schema was deployed correctly
-- ============================================================================

-- 1. Check that all tables exist
SELECT
  'Tables Created' as check_name,
  COUNT(*) as actual,
  18 as expected,
  CASE WHEN COUNT(*) = 18 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'org_hierarchy', 'user_profiles', 'business_rules', 'consultant_targets',
    'data_assets', 'candidates', 'job_orders', 'client_corporations',
    'submission_status_log', 'placements', 'activities', 'strategic_referrals',
    'dashboards', 'dashboard_widgets', 'context_documents', 'unmatched_terms',
    'ingestion_runs', 'audit_log'
  );

-- 2. Check org_hierarchy seed data (should have 9 rows)
SELECT
  'Org Hierarchy Seeded' as check_name,
  COUNT(*) as actual,
  13 as expected,  -- 1 national + 4 regions + 8 teams
  CASE WHEN COUNT(*) >= 13 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM org_hierarchy;

-- 3. Check business_rules seed data
SELECT
  'Business Rules Seeded' as check_name,
  COUNT(*) as actual,
  4 as expected,
  CASE WHEN COUNT(*) >= 4 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM business_rules;

-- 4. Check data_assets seed data (should have 15 rows)
SELECT
  'Data Assets Seeded' as check_name,
  COUNT(*) as actual,
  15 as expected,
  CASE WHEN COUNT(*) = 15 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM data_assets;

-- 5. Check context_documents seed data (should have 4 rows)
SELECT
  'Context Documents Seeded' as check_name,
  COUNT(*) as actual,
  4 as expected,
  CASE WHEN COUNT(*) = 4 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM context_documents;

-- 6. Check RLS is enabled on all tables
SELECT
  'RLS Enabled on All Tables' as check_name,
  COUNT(*) as actual,
  18 as expected,
  CASE WHEN COUNT(*) = 18 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
  AND tablename IN (
    'org_hierarchy', 'user_profiles', 'business_rules', 'consultant_targets',
    'data_assets', 'candidates', 'job_orders', 'client_corporations',
    'submission_status_log', 'placements', 'activities', 'strategic_referrals',
    'dashboards', 'dashboard_widgets', 'context_documents', 'unmatched_terms',
    'ingestion_runs', 'audit_log'
  );

-- 7. Check revenue blending multiplier
SELECT
  'Revenue Multiplier Correct' as check_name,
  (rule_value->>'multiplier')::integer as actual,
  1000 as expected,
  CASE WHEN (rule_value->>'multiplier')::integer = 1000 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM business_rules
WHERE rule_type = 'revenue_blending'
  AND rule_key = 'contract_to_perm_multiplier';

-- 8. List all org hierarchy entities
SELECT
  hierarchy_level,
  name,
  is_sales_team,
  CASE WHEN parent_id IS NULL THEN 'ROOT' ELSE 'CHILD' END as level_type
FROM org_hierarchy
ORDER BY
  CASE hierarchy_level
    WHEN 'national' THEN 1
    WHEN 'region' THEN 2
    WHEN 'team' THEN 3
    WHEN 'individual' THEN 4
  END,
  name;
