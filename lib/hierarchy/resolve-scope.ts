/**
 * Scope Resolution Utilities
 *
 * Resolves hierarchy scope selections into concrete consultant UUIDs.
 * The org_hierarchy tree is: National → Region → Team, with users at Team level.
 */

import { createClient } from '@/lib/supabase/client';

export interface HierarchyNode {
  id: string;
  parent_id: string | null;
  hierarchy_level: 'national' | 'region' | 'team' | 'individual';
  name: string;
  is_sales_team: boolean;
}

export interface ConsultantEntry {
  id: string; // user_profiles.id (auth UUID)
  hierarchy_node_id: string | null;
  display_name: string | null;
}

/**
 * Fetch the full org_hierarchy tree from Supabase.
 */
export async function fetchHierarchyTree(): Promise<HierarchyNode[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('org_hierarchy')
    .select('id, parent_id, hierarchy_level, name, is_sales_team')
    .order('name');

  if (error) throw new Error(`Failed to fetch hierarchy: ${error.message}`);
  return data ?? [];
}

/**
 * Fetch all consultants with their hierarchy_node_id.
 */
export async function fetchConsultantMap(): Promise<ConsultantEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, hierarchy_node_id, display_name')
    .not('hierarchy_node_id', 'is', null);

  if (error) throw new Error(`Failed to fetch consultants: ${error.message}`);
  return data ?? [];
}

/**
 * Given a set of selected org_hierarchy node IDs, resolve to all
 * descendant team-level node IDs (expanding regions to their child teams).
 */
export function expandNodeIds(
  selectedNodeIds: string[],
  tree: HierarchyNode[]
): string[] {
  const result = new Set<string>();

  for (const nodeId of selectedNodeIds) {
    const node = tree.find((n) => n.id === nodeId);
    if (!node) continue;

    if (node.hierarchy_level === 'team') {
      result.add(node.id);
    } else if (node.hierarchy_level === 'region') {
      // Add all child teams of this region
      tree
        .filter((n) => n.parent_id === node.id && n.hierarchy_level === 'team')
        .forEach((n) => result.add(n.id));
    } else if (node.hierarchy_level === 'national') {
      // Add all teams
      tree
        .filter((n) => n.hierarchy_level === 'team')
        .forEach((n) => result.add(n.id));
    }
  }

  return Array.from(result);
}

/**
 * Resolve node IDs to consultant UUIDs.
 * Returns null if no filtering should be applied (national scope).
 */
export function resolveConsultantIds(
  nodeIds: string[],
  consultants: ConsultantEntry[]
): string[] {
  const nodeIdSet = new Set(nodeIds);
  return consultants
    .filter((c) => c.hierarchy_node_id && nodeIdSet.has(c.hierarchy_node_id))
    .map((c) => c.id);
}

/**
 * Find the team node for a given user, and the parent region.
 */
export function getUserTeamAndRegion(
  userNodeId: string,
  tree: HierarchyNode[]
): { teamNode: HierarchyNode | null; regionNode: HierarchyNode | null } {
  const teamNode = tree.find((n) => n.id === userNodeId) ?? null;
  const regionNode = teamNode?.parent_id
    ? (tree.find((n) => n.id === teamNode.parent_id) ?? null)
    : null;
  return { teamNode, regionNode };
}

/**
 * Get all team IDs that share the same parent region as the given node.
 */
export function getTeamSiblingIds(
  nodeId: string,
  tree: HierarchyNode[]
): string[] {
  const node = tree.find((n) => n.id === nodeId);
  if (!node) return [nodeId];

  if (node.hierarchy_level === 'team' && node.parent_id) {
    return tree
      .filter((n) => n.parent_id === node.parent_id && n.hierarchy_level === 'team')
      .map((n) => n.id);
  }

  return [nodeId];
}

/**
 * Build a human-readable label for the current scope selection.
 */
export function buildScopeLabel(
  preset: 'self' | 'my-team' | 'custom' | 'national',
  selectedNodeIds: string[],
  tree: HierarchyNode[]
): string {
  switch (preset) {
    case 'self':
      return 'My Performance';
    case 'my-team':
      return 'My Team';
    case 'national':
      return 'National';
    case 'custom': {
      if (selectedNodeIds.length === 0) return 'Custom';
      if (selectedNodeIds.length === 1) {
        const node = tree.find((n) => n.id === selectedNodeIds[0]);
        return node?.name ?? 'Custom';
      }
      // Check if all selected are teams under one region
      const nodes = selectedNodeIds
        .map((id) => tree.find((n) => n.id === id))
        .filter(Boolean) as HierarchyNode[];
      const parents = new Set(nodes.map((n) => n.parent_id));
      if (parents.size === 1 && nodes[0]?.parent_id) {
        const region = tree.find((n) => n.id === nodes[0].parent_id);
        if (region) {
          const totalTeamsInRegion = tree.filter(
            (n) => n.parent_id === region.id && n.hierarchy_level === 'team'
          ).length;
          if (nodes.length === totalTeamsInRegion) return region.name;
        }
      }
      return `${selectedNodeIds.length} teams`;
    }
  }
}
