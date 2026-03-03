/**
 * Server-Side Scope Resolution for AI Chat
 *
 * Maps natural language scope references (team names, region names,
 * island names, consultant names) to consultant UUIDs for query filtering.
 *
 * Uses the same pure functions from resolve-scope.ts (expandNodeIds,
 * resolveConsultantIds) but fetches data with the server Supabase client.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { expandNodeIds, resolveConsultantIds } from '@/lib/hierarchy/resolve-scope';
import type { HierarchyNode, ConsultantEntry } from '@/lib/hierarchy/resolve-scope';

// ============================================================================
// Scope Aliases — maps natural language to org_hierarchy node IDs
// ============================================================================

// Full UUIDs for the org hierarchy (from seed data migration)
const NODE = {
  national:              '00000000-0000-0000-0000-000000000001',
  auckland_region:       '00000000-0000-0000-0000-000000000010',
  wellington_region:     '00000000-0000-0000-0000-000000000020',
  christchurch_region:   '00000000-0000-0000-0000-000000000030',
  dunedin_region:        '00000000-0000-0000-0000-000000000040',
  auckland_perm:         '00000000-0000-0000-0000-000000000011',
  auckland_contract:     '00000000-0000-0000-0000-000000000012',
  wellington_perm:       '00000000-0000-0000-0000-000000000021',
  wellington_contract:   '00000000-0000-0000-0000-000000000022',
  christchurch_perm:     '00000000-0000-0000-0000-000000000031',
  christchurch_contract: '00000000-0000-0000-0000-000000000032',
  dunedin_perm:          '00000000-0000-0000-0000-000000000041',
  dunedin_contract:      '00000000-0000-0000-0000-000000000042',
} as const;

/**
 * Maps lowercase alias strings to arrays of org_hierarchy node IDs.
 * Regions expand to their child teams during resolution.
 */
const SCOPE_ALIASES: Record<string, string[]> = {
  // National
  'national': [NODE.national],
  'all': [NODE.national],
  'everyone': [NODE.national],
  'company': [NODE.national],
  'potentia': [NODE.national],

  // Regions
  'auckland': [NODE.auckland_region],
  'wellington': [NODE.wellington_region],
  'welly': [NODE.wellington_region],
  'christchurch': [NODE.christchurch_region],
  'chch': [NODE.christchurch_region],
  'dunedin': [NODE.dunedin_region],

  // Islands
  'north island': [NODE.auckland_region, NODE.wellington_region],
  'south island': [NODE.christchurch_region, NODE.dunedin_region],

  // Specific teams
  'auckland perm': [NODE.auckland_perm],
  'auckland permanent': [NODE.auckland_perm],
  'auckland contract': [NODE.auckland_contract],
  'wellington perm': [NODE.wellington_perm],
  'wellington permanent': [NODE.wellington_perm],
  'wellington contract': [NODE.wellington_contract],
  'welly perm': [NODE.wellington_perm],
  'welly contract': [NODE.wellington_contract],
  'christchurch perm': [NODE.christchurch_perm],
  'christchurch permanent': [NODE.christchurch_perm],
  'christchurch contract': [NODE.christchurch_contract],
  'chch perm': [NODE.christchurch_perm],
  'chch contract': [NODE.christchurch_contract],
  'dunedin perm': [NODE.dunedin_perm],
  'dunedin permanent': [NODE.dunedin_perm],
  'dunedin contract': [NODE.dunedin_contract],
};

// ============================================================================
// Main Resolution Function
// ============================================================================

export interface ScopeResult {
  consultantIds: string[] | null; // null = national (no filter)
  label: string;
}

/**
 * Resolve a scope string from the AI tool call into consultant UUIDs.
 *
 * Resolution order:
 * 1. null/empty/national → null (no filter)
 * 2. Known alias (region, island, team name) → expand to consultant IDs
 * 3. Consultant name lookup via ilike on display_name
 * 4. Fallback → null (national scope)
 */
export async function resolveScope(
  scope: string | null | undefined,
  supabase: SupabaseClient
): Promise<ScopeResult> {
  // No scope = national
  if (!scope) {
    return { consultantIds: null, label: 'National' };
  }

  const normalized = scope.trim().toLowerCase();

  // Check if it's a national alias
  if (normalized === 'national' || normalized === 'all' || normalized === 'everyone') {
    return { consultantIds: null, label: 'National' };
  }

  // Check known aliases
  const aliasNodeIds = SCOPE_ALIASES[normalized];
  if (aliasNodeIds) {
    // Fetch hierarchy tree and consultants
    const [tree, consultants] = await Promise.all([
      fetchHierarchyTree(supabase),
      fetchConsultantEntries(supabase),
    ]);

    const expandedNodeIds = expandNodeIds(aliasNodeIds, tree);
    const consultantIds = resolveConsultantIds(expandedNodeIds, consultants);

    if (consultantIds.length > 0) {
      return { consultantIds, label: scope };
    }
    // If no consultants found for alias, fall through to national
    return { consultantIds: null, label: `${scope} (no consultants found, showing national)` };
  }

  // Try consultant name lookup
  const { data: matchedProfiles } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .ilike('display_name', `%${normalized}%`)
    .limit(10);

  if (matchedProfiles && matchedProfiles.length > 0) {
    return {
      consultantIds: matchedProfiles.map((p: { id: string }) => p.id),
      label: matchedProfiles.length === 1
        ? matchedProfiles[0].display_name || scope
        : `${matchedProfiles.length} consultants matching "${scope}"`,
    };
  }

  // Fallback: national
  return { consultantIds: null, label: `${scope} (not recognized, showing national)` };
}

// ============================================================================
// Server-Side Data Fetchers
// ============================================================================

async function fetchHierarchyTree(supabase: SupabaseClient): Promise<HierarchyNode[]> {
  const { data, error } = await supabase
    .from('org_hierarchy')
    .select('id, parent_id, hierarchy_level, name, is_sales_team')
    .order('name');

  if (error) throw new Error(`Failed to fetch hierarchy: ${error.message}`);
  return (data ?? []) as HierarchyNode[];
}

async function fetchConsultantEntries(supabase: SupabaseClient): Promise<ConsultantEntry[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, hierarchy_node_id, display_name')
    .not('hierarchy_node_id', 'is', null);

  if (error) throw new Error(`Failed to fetch consultants: ${error.message}`);
  return (data ?? []) as ConsultantEntry[];
}
