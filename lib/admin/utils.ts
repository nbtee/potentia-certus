import type { OrgNode, ConsultantTarget } from './types';

/**
 * Flatten a tree of OrgNodes into a flat array with depth info.
 */
export function flattenHierarchy(
  nodes: OrgNode[],
  parentId: string | null = null,
  depth: number = 0
): (OrgNode & { depth: number })[] {
  const result: (OrgNode & { depth: number })[] = [];
  const children = nodes.filter((n) => n.parent_id === parentId);

  for (const child of children) {
    result.push({ ...child, depth });
    result.push(...flattenHierarchy(nodes, child.id, depth + 1));
  }

  return result;
}

/**
 * Get valid parent nodes for a given node (prevents circular references).
 * A node cannot be its own parent, and cannot be a child of itself.
 */
export function getValidParents(
  nodes: OrgNode[],
  currentNodeId?: string
): OrgNode[] {
  if (!currentNodeId) return nodes;

  const descendants = new Set<string>();

  function collectDescendants(nodeId: string) {
    for (const node of nodes) {
      if (node.parent_id === nodeId) {
        descendants.add(node.id);
        collectDescendants(node.id);
      }
    }
  }

  descendants.add(currentNodeId);
  collectDescendants(currentNodeId);

  return nodes.filter((n) => !descendants.has(n.id));
}

/**
 * Aggregate individual targets up to team level.
 */
export function aggregateTeamTargets(
  targets: ConsultantTarget[],
  targetType: string,
  periodStart: string,
  periodEnd: string
): number {
  return targets
    .filter(
      (t) =>
        t.target_type === targetType &&
        t.period_start === periodStart &&
        t.period_end === periodEnd
    )
    .reduce((sum, t) => sum + t.target_value, 0);
}

/**
 * Convert weekly target value to monthly equivalent.
 * Uses approximate 4.33 weeks per month.
 */
export function weeklyToMonthly(weeklyValue: number): number {
  return Math.round(weeklyValue * 4.33 * 100) / 100;
}

/**
 * Format a hierarchy level as display text.
 */
export function formatHierarchyLevel(level: string): string {
  const labels: Record<string, string> = {
    national: 'National',
    region: 'Region',
    team: 'Team',
    individual: 'Individual',
  };
  return labels[level] || level;
}
