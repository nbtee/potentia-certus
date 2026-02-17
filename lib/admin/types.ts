// =============================================================================
// Admin entity types — mirrors database schema
// =============================================================================

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  hierarchy_node_id: string | null;
  bullhorn_corporate_user_id: number | null;
  role: 'consultant' | 'team_lead' | 'manager' | 'admin';
  is_active: boolean;
  deactivated_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields
  hierarchy_node?: OrgNode | null;
}

export interface OrgNode {
  id: string;
  parent_id: string | null;
  hierarchy_level: 'national' | 'region' | 'team' | 'individual';
  name: string;
  bullhorn_department_id: number | null;
  is_sales_team: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Computed
  member_count?: number;
  children?: OrgNode[];
}

export interface BusinessRule {
  id: string;
  rule_type: string;
  rule_key: string;
  rule_value: Record<string, unknown>;
  effective_from: string;
  effective_until: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultantTarget {
  id: string;
  consultant_id: string;
  target_type: string;
  target_value: number;
  period_type: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  consultant?: Pick<UserProfile, 'id' | 'first_name' | 'last_name' | 'email'>;
}

export interface DataAsset {
  id: string;
  asset_key: string;
  display_name: string;
  description: string | null;
  synonyms: string[];
  category: 'activity' | 'revenue' | 'pipeline' | 'performance';
  output_shapes: string[];
  available_dimensions: string[];
  available_filters: string[];
  query_template: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  widget_count?: number;
}

export interface ContextDocument {
  id: string;
  document_type: 'business_vernacular' | 'leading_lagging_indicators' | 'motivation_framework' | 'metric_relationships';
  title: string;
  content: string;
  version: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnmatchedTerm {
  id: string;
  user_query: string;
  unmatched_term: string;
  suggested_data_asset_id: string | null;
  resolution_status: 'pending' | 'added_synonym' | 'ignored' | 'new_asset_created';
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  // Computed
  frequency?: number;
}

export interface IngestionRun {
  id: string;
  run_type: 'full_sync' | 'incremental_sync' | 'reconciliation';
  source_table: string;
  target_table: string;
  records_processed: number;
  records_inserted: number;
  records_updated: number;
  records_failed: number;
  status: 'running' | 'completed' | 'failed' | 'partial';
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  total_count: number;
}

export type AdminRole = 'consultant' | 'team_lead' | 'manager' | 'admin';
