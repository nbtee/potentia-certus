'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { writeAuditLog } from '@/lib/admin/audit';
import type { OrgNode } from '@/lib/admin/types';

type ActionResult<T = void> =
  | { data: T; error?: never }
  | { data?: never; error: string };

async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return null;
  return user.id;
}

// =============================================================================
// List Nodes
// =============================================================================

export async function listNodes(): Promise<ActionResult<OrgNode[]>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const supabase = await createClient();

  const { data: nodes, error } = await supabase
    .from('org_hierarchy')
    .select('*')
    .order('hierarchy_level')
    .order('name');

  if (error) return { error: error.message };

  // Get member counts per node
  const { data: memberCounts } = await supabase
    .from('user_profiles')
    .select('hierarchy_node_id')
    .not('hierarchy_node_id', 'is', null);

  const countMap = new Map<string, number>();
  for (const row of memberCounts ?? []) {
    const nodeId = row.hierarchy_node_id as string;
    countMap.set(nodeId, (countMap.get(nodeId) ?? 0) + 1);
  }

  const result = (nodes ?? []).map((n) => ({
    ...n,
    member_count: countMap.get(n.id) ?? 0,
  })) as OrgNode[];

  return { data: result };
}

// =============================================================================
// Create Node
// =============================================================================

const createNodeSchema = z.object({
  name: z.string().min(1),
  hierarchy_level: z.enum(['national', 'region', 'team', 'individual']),
  parent_id: z.string().uuid().nullable(),
  is_sales_team: z.boolean().optional(),
});

export async function createNode(
  input: z.infer<typeof createNodeSchema>
): Promise<ActionResult<OrgNode>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const parsed = createNodeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('org_hierarchy')
    .insert({
      name: parsed.data.name,
      hierarchy_level: parsed.data.hierarchy_level,
      parent_id: parsed.data.parent_id,
      is_sales_team: parsed.data.is_sales_team ?? true,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAuditLog('hierarchy.create', 'org_hierarchy', data.id, null, {
    name: parsed.data.name,
    level: parsed.data.hierarchy_level,
  });

  revalidatePath('/admin/hierarchy');
  return { data: data as OrgNode };
}

// =============================================================================
// Update Node
// =============================================================================

const updateNodeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  is_sales_team: z.boolean().optional(),
});

export async function updateNode(
  input: z.infer<typeof updateNodeSchema>
): Promise<ActionResult<OrgNode>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const parsed = updateNodeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  const { data: oldNode } = await supabase
    .from('org_hierarchy')
    .select('*')
    .eq('id', parsed.data.id)
    .single();

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.parent_id !== undefined) updates.parent_id = parsed.data.parent_id;
  if (parsed.data.is_sales_team !== undefined) updates.is_sales_team = parsed.data.is_sales_team;

  const { data, error } = await supabase
    .from('org_hierarchy')
    .update(updates)
    .eq('id', parsed.data.id)
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAuditLog(
    'hierarchy.update',
    'org_hierarchy',
    parsed.data.id,
    oldNode as Record<string, unknown> | null,
    updates
  );

  revalidatePath('/admin/hierarchy');
  return { data: data as OrgNode };
}

// =============================================================================
// Delete Node
// =============================================================================

export async function deleteNode(nodeId: string): Promise<ActionResult<void>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const supabase = await createClient();

  // Check for children
  const { count: childCount } = await supabase
    .from('org_hierarchy')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', nodeId);

  if ((childCount ?? 0) > 0) {
    return { error: 'Cannot delete node with children. Reassign or delete children first.' };
  }

  // Check for members
  const { count: memberCount } = await supabase
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('hierarchy_node_id', nodeId);

  if ((memberCount ?? 0) > 0) {
    return { error: 'Cannot delete node with assigned members. Reassign members first.' };
  }

  const { data: oldNode } = await supabase
    .from('org_hierarchy')
    .select('*')
    .eq('id', nodeId)
    .single();

  const { error } = await supabase
    .from('org_hierarchy')
    .delete()
    .eq('id', nodeId);

  if (error) return { error: error.message };

  await writeAuditLog(
    'hierarchy.delete',
    'org_hierarchy',
    nodeId,
    oldNode as Record<string, unknown> | null,
    null
  );

  revalidatePath('/admin/hierarchy');
  return { data: undefined };
}
