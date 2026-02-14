-- ============================================================================
-- Potentia Certus: Initial Schema Migration
-- Created: 2026-02-13
--
-- Simplified Architecture:
-- - All authenticated users can see all data (no hierarchical RLS)
-- - Direct SubmissionHistory ingestion (no polling system)
-- - 3-level hierarchy: National → Region → Team → Individual
-- - 4 regions: Auckland, Wellington, Christchurch, Dunedin
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================================
-- 1. ORGANIZATIONAL STRUCTURE
-- ============================================================================

-- Org Hierarchy (National → Region → Team → Individual)
CREATE TABLE org_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES org_hierarchy(id) ON DELETE CASCADE,
  hierarchy_level TEXT NOT NULL CHECK (hierarchy_level IN ('national', 'region', 'team', 'individual')),
  name TEXT NOT NULL,
  bullhorn_department_id INTEGER, -- Maps to Departments.Id in SQL Server
  is_sales_team BOOLEAN DEFAULT true, -- false for Optopi (operations)
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_hierarchy_parent ON org_hierarchy(parent_id);
CREATE INDEX idx_org_hierarchy_level ON org_hierarchy(hierarchy_level);
CREATE INDEX idx_org_hierarchy_bullhorn_dept ON org_hierarchy(bullhorn_department_id);

COMMENT ON TABLE org_hierarchy IS '3-level organizational hierarchy: National → Region (Auckland/Wellington/Christchurch/Dunedin) → Team (Perm/Contract) → Individual';
COMMENT ON COLUMN org_hierarchy.is_sales_team IS 'false for operations teams like Optopi (excluded from sales metrics)';

-- ============================================================================
-- 2. USER MANAGEMENT
-- ============================================================================

-- User Profiles (extends Supabase Auth users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  hierarchy_node_id UUID REFERENCES org_hierarchy(id) ON DELETE SET NULL,
  bullhorn_corporate_user_id INTEGER, -- Maps to CorporateUsers.Id in SQL Server
  role TEXT NOT NULL DEFAULT 'consultant' CHECK (role IN ('consultant', 'team_lead', 'manager', 'admin')),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_hierarchy ON user_profiles(hierarchy_node_id);
CREATE INDEX idx_user_profiles_bullhorn_id ON user_profiles(bullhorn_corporate_user_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

COMMENT ON TABLE user_profiles IS 'Extended user data linked to Supabase Auth. All authenticated users can see all data (matching Bullhorn access model).';

-- ============================================================================
-- 3. BUSINESS CONFIGURATION
-- ============================================================================

-- Business Rules (revenue blending multipliers, thresholds)
CREATE TABLE business_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  rule_value JSONB NOT NULL,
  effective_from DATE NOT NULL,
  effective_until DATE,
  description TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rule_type, rule_key, effective_from)
);

CREATE INDEX idx_business_rules_type ON business_rules(rule_type);
CREATE INDEX idx_business_rules_effective ON business_rules(effective_from, effective_until);

COMMENT ON TABLE business_rules IS 'Revenue blending multipliers (1000x), target thresholds, effective-dated configuration';

-- Insert initial revenue blending multiplier
INSERT INTO business_rules (rule_type, rule_key, rule_value, effective_from, description) VALUES
('revenue_blending', 'contract_to_perm_multiplier', '{"multiplier": 1000}'::jsonb, '2026-01-01', 'Contract hourly GP × 1000 = equivalent perm billing');

-- Consultant Targets (dynamic targets with date ranges)
CREATE TABLE consultant_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL, -- 'revenue', 'placements', 'submittals', 'calls', etc.
  target_value NUMERIC NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consultant_targets_consultant ON consultant_targets(consultant_id);
CREATE INDEX idx_consultant_targets_period ON consultant_targets(period_start, period_end);
CREATE INDEX idx_consultant_targets_type ON consultant_targets(target_type);

COMMENT ON TABLE consultant_targets IS 'Dynamic targets with date ranges, consultant-specific';

-- Data Assets (measure definitions)
CREATE TABLE data_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  synonyms TEXT[] DEFAULT '{}',
  category TEXT NOT NULL, -- 'activity', 'revenue', 'pipeline', 'performance'
  output_shapes TEXT[] NOT NULL, -- ['single_value', 'time_series', 'categorical', etc.]
  available_dimensions TEXT[] DEFAULT '{}', -- ['time', 'consultant', 'team', 'region']
  available_filters TEXT[] DEFAULT '{}',
  query_template TEXT, -- SQL template or function name
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_data_assets_category ON data_assets(category);
CREATE INDEX idx_data_assets_key ON data_assets(asset_key);

COMMENT ON TABLE data_assets IS '12-15 core measure definitions for AI natural language query mapping';

-- ============================================================================
-- 4. CORE DATA (from SQL Server)
-- ============================================================================

-- Candidates
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bullhorn_id INTEGER UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  address1 TEXT,
  address2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_candidates_bullhorn_id ON candidates(bullhorn_id);
CREATE INDEX idx_candidates_name ON candidates(last_name, first_name);

-- Job Orders
CREATE TABLE job_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bullhorn_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  consultant_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  client_corporation_id UUID,
  employment_type TEXT CHECK (employment_type IN ('Permanent', 'Contract')),
  status TEXT,
  date_added TIMESTAMPTZ,
  date_last_modified TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_orders_bullhorn_id ON job_orders(bullhorn_id);
CREATE INDEX idx_job_orders_consultant ON job_orders(consultant_id);
CREATE INDEX idx_job_orders_modified ON job_orders(date_last_modified);

-- Client Corporations
CREATE TABLE client_corporations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bullhorn_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  industry TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_corporations_bullhorn_id ON client_corporations(bullhorn_id);
CREATE INDEX idx_client_corporations_name ON client_corporations(name);

-- Submission Status Log (directly ingested from SubmissionHistory - append-only)
CREATE TABLE submission_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bullhorn_submission_id INTEGER NOT NULL,
  bullhorn_submission_history_id INTEGER UNIQUE, -- Maps to SubmissionHistory.id
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  job_order_id UUID REFERENCES job_orders(id) ON DELETE CASCADE,
  consultant_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  status_from TEXT,
  status_to TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL,
  comments TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submission_status_log_submission ON submission_status_log(bullhorn_submission_id);
CREATE INDEX idx_submission_status_log_candidate ON submission_status_log(candidate_id);
CREATE INDEX idx_submission_status_log_job_order ON submission_status_log(job_order_id);
CREATE INDEX idx_submission_status_log_consultant ON submission_status_log(consultant_id);
CREATE INDEX idx_submission_status_log_detected_at ON submission_status_log(detected_at);
CREATE INDEX idx_submission_status_log_status ON submission_status_log(status_to);

COMMENT ON TABLE submission_status_log IS 'Append-only log of all submission status transitions, directly ingested from SubmissionHistory table (no polling needed)';

-- Placements (revenue data)
CREATE TABLE placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bullhorn_id INTEGER UNIQUE NOT NULL,
  consultant_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  job_order_id UUID REFERENCES job_orders(id) ON DELETE SET NULL,
  revenue_type TEXT NOT NULL CHECK (revenue_type IN ('permanent', 'contract')),

  -- Revenue fields (authoritative: use Margin field from SQL Server)
  fee_amount NUMERIC(15,2), -- For permanent: Margin (salary × fee %)
  gp_per_hour NUMERIC(10,2), -- For contract: Margin (GP per hour)
  candidate_salary NUMERIC(15,2), -- Reference only

  -- Contract duration (for revenue calculation: Margin × 8hrs/day × duration)
  start_date DATE,
  end_date DATE,

  placement_date DATE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_placements_bullhorn_id ON placements(bullhorn_id);
CREATE INDEX idx_placements_consultant ON placements(consultant_id);
CREATE INDEX idx_placements_candidate ON placements(candidate_id);
CREATE INDEX idx_placements_date ON placements(placement_date);
CREATE INDEX idx_placements_revenue_type ON placements(revenue_type);

COMMENT ON TABLE placements IS 'Placement records with revenue. Use fee_amount for perm, gp_per_hour × 8 × duration for contract';
COMMENT ON COLUMN placements.fee_amount IS 'For permanent: Total fee amount (Margin = salary × fee %)';
COMMENT ON COLUMN placements.gp_per_hour IS 'For contract: GP per hour (Margin). Calculate total: gp_per_hour × 8 hours × contract days';

-- Activities (calls, meetings, notes)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bullhorn_id INTEGER UNIQUE NOT NULL,
  activity_type TEXT NOT NULL, -- Maps to Notes.action (42 distinct types)
  consultant_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  job_order_id UUID REFERENCES job_orders(id) ON DELETE SET NULL,
  activity_date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_bullhorn_id ON activities(bullhorn_id);
CREATE INDEX idx_activities_consultant ON activities(consultant_id);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_date ON activities(activity_date);

COMMENT ON TABLE activities IS 'All activity records from Notes table (WHERE isDeleted = 0)';

-- Strategic Referrals (filtered from activities where action='Strategic Referral')
CREATE TABLE strategic_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  consultant_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  referral_date TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_strategic_referrals_consultant ON strategic_referrals(consultant_id);
CREATE INDEX idx_strategic_referrals_date ON strategic_referrals(referral_date);

COMMENT ON TABLE strategic_referrals IS 'Strategic referrals extracted from activities where activity_type = ''Strategic Referral'' (304 records found)';

-- ============================================================================
-- 5. DASHBOARD PERSISTENCE
-- ============================================================================

-- Dashboards
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  layout JSONB NOT NULL DEFAULT '[]'::jsonb, -- react-grid-layout positions
  is_template BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dashboards_owner ON dashboards(owner_id);
CREATE INDEX idx_dashboards_template ON dashboards(is_template);

-- Dashboard Widgets
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  data_asset_id UUID NOT NULL REFERENCES data_assets(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL, -- 'single-value', 'time-series-combo', 'categorical-bar', etc.
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb, -- filters, group_by, date ranges
  widget_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- title, colors, axis labels
  position JSONB NOT NULL, -- {x, y, w, h} for react-grid-layout
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dashboard_widgets_dashboard ON dashboard_widgets(dashboard_id);
CREATE INDEX idx_dashboard_widgets_data_asset ON dashboard_widgets(data_asset_id);

COMMENT ON TABLE dashboard_widgets IS 'Widget specs persist in DB. AI builds once, DB serves ongoing (no AI tokens for rendering)';

-- ============================================================================
-- 6. ADMIN & CONTEXT
-- ============================================================================

-- Context Documents (4 markdown docs for AI system prompt)
CREATE TABLE context_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT UNIQUE NOT NULL CHECK (document_type IN ('business_vernacular', 'leading_lagging_indicators', 'motivation_framework', 'metric_relationships')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_context_documents_type ON context_documents(document_type);

COMMENT ON TABLE context_documents IS '4 markdown context documents injected into AI system prompt for natural language query understanding';

-- Unmatched Terms (AI synonym feedback loop)
CREATE TABLE unmatched_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_query TEXT NOT NULL,
  unmatched_term TEXT NOT NULL,
  suggested_data_asset_id UUID REFERENCES data_assets(id) ON DELETE SET NULL,
  resolution_status TEXT DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'added_synonym', 'ignored', 'new_asset_created')),
  resolved_by UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_unmatched_terms_status ON unmatched_terms(resolution_status);
CREATE INDEX idx_unmatched_terms_term ON unmatched_terms(unmatched_term);

COMMENT ON TABLE unmatched_terms IS 'Captures terms AI could not map to data assets, enabling synonym expansion';

-- Ingestion Runs (sync health tracking)
CREATE TABLE ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL, -- 'full_sync', 'incremental_sync', 'reconciliation'
  source_table TEXT NOT NULL,
  target_table TEXT NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_ingestion_runs_source ON ingestion_runs(source_table);
CREATE INDEX idx_ingestion_runs_started ON ingestion_runs(started_at);
CREATE INDEX idx_ingestion_runs_status ON ingestion_runs(status);

-- ============================================================================
-- 7. SECURITY & AUDIT (private schema)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS private;

-- Audit Log
CREATE TABLE private.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON private.audit_log(user_id);
CREATE INDEX idx_audit_log_table ON private.audit_log(table_name);
CREATE INDEX idx_audit_log_created ON private.audit_log(created_at);

COMMENT ON TABLE private.audit_log IS 'Security audit trail for all sensitive operations';

-- AI Rate Limits
CREATE TABLE private.ai_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_rate_limits_user ON private.ai_rate_limits(user_id);
CREATE INDEX idx_ai_rate_limits_window ON private.ai_rate_limits(window_start, window_end);

COMMENT ON TABLE private.ai_rate_limits IS 'Rate limiting for AI queries (10 requests per minute per user)';

-- ============================================================================
-- 8. ROW LEVEL SECURITY (SIMPLIFIED)
-- ============================================================================

-- Enable RLS on all public tables
ALTER TABLE org_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_corporations ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE unmatched_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_runs ENABLE ROW LEVEL SECURITY;

-- SIMPLIFIED RLS: All authenticated users can see all data
-- (Matching Bullhorn access model - restriction is on export only)

CREATE POLICY "authenticated_users_read_all" ON org_hierarchy
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_all" ON user_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_all" ON business_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_all" ON consultant_targets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_all" ON data_assets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_all" ON candidates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_all" ON job_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_all" ON client_corporations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_all" ON submission_status_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_all" ON placements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_all" ON activities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_all" ON strategic_referrals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_all" ON dashboards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_all" ON dashboard_widgets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_all" ON context_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_all" ON unmatched_terms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_all" ON ingestion_runs
  FOR SELECT TO authenticated USING (true);

-- Users can modify their own dashboards
CREATE POLICY "users_manage_own_dashboards" ON dashboards
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "users_manage_own_dashboard_widgets" ON dashboard_widgets
  FOR ALL TO authenticated
  USING (dashboard_id IN (SELECT id FROM dashboards WHERE owner_id = auth.uid()))
  WITH CHECK (dashboard_id IN (SELECT id FROM dashboards WHERE owner_id = auth.uid()));

-- Admins can manage configuration
CREATE POLICY "admins_manage_business_rules" ON business_rules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admins_manage_targets" ON consultant_targets
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Calculate contract revenue (Margin × 8 hours/day × duration)
CREATE OR REPLACE FUNCTION calculate_contract_revenue(
  gp_per_hour NUMERIC,
  start_date DATE,
  end_date DATE
) RETURNS NUMERIC AS $$
DECLARE
  duration_days INTEGER;
  total_hours NUMERIC;
BEGIN
  IF gp_per_hour IS NULL OR start_date IS NULL OR end_date IS NULL THEN
    RETURN 0;
  END IF;

  duration_days := end_date - start_date;
  IF duration_days < 0 THEN
    duration_days := 0;
  END IF;

  total_hours := duration_days * 8; -- 8 hours per day standard assumption
  RETURN gp_per_hour * total_hours;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_contract_revenue IS 'Calculate total contract revenue: GP per hour × 8 hours/day × contract duration';

-- Calculate blended revenue (perm + contract with 1000x multiplier)
CREATE OR REPLACE FUNCTION calculate_blended_revenue(
  revenue_type TEXT,
  fee_amount NUMERIC,
  gp_per_hour NUMERIC,
  start_date DATE,
  end_date DATE
) RETURNS NUMERIC AS $$
DECLARE
  contract_revenue NUMERIC;
  multiplier NUMERIC := 1000; -- Contract to perm multiplier
BEGIN
  IF revenue_type = 'permanent' THEN
    RETURN COALESCE(fee_amount, 0);
  ELSIF revenue_type = 'contract' THEN
    contract_revenue := calculate_contract_revenue(gp_per_hour, start_date, end_date);
    RETURN contract_revenue / multiplier; -- Normalize to perm equivalent
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_blended_revenue IS 'Calculate blended revenue: perm fee_amount OR (contract revenue ÷ 1000) for normalized comparison';

-- ============================================================================
-- 10. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with that column
CREATE TRIGGER update_org_hierarchy_updated_at BEFORE UPDATE ON org_hierarchy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_rules_updated_at BEFORE UPDATE ON business_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultant_targets_updated_at BEFORE UPDATE ON consultant_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_assets_updated_at BEFORE UPDATE ON data_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_orders_updated_at BEFORE UPDATE ON job_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_corporations_updated_at BEFORE UPDATE ON client_corporations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_placements_updated_at BEFORE UPDATE ON placements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON dashboards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_widgets_updated_at BEFORE UPDATE ON dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_context_documents_updated_at BEFORE UPDATE ON context_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS 'Potentia Certus initial schema - simplified architecture with direct SubmissionHistory ingestion and authentication-only RLS';
