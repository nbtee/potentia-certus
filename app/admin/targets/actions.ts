'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { writeAuditLog } from '@/lib/admin/audit';
import type { ConsultantTarget } from '@/lib/admin/types';

type ActionResult<T = void> =
  | { data: T; error?: never }
  | { data?: never; error: string };

async function requireAdminOrManager(): Promise<string | null> {
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

  if (profile?.role !== 'admin' && profile?.role !== 'manager') return null;
  return user.id;
}

// =============================================================================
// List Targets
// =============================================================================

export async function listTargets(): Promise<ActionResult<ConsultantTarget[]>> {
  const userId = await requireAdminOrManager();
  if (!userId) return { error: 'Admin or manager access required' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('consultant_targets')
    .select('*, user_profiles!consultant_targets_consultant_id_fkey(id, first_name, last_name, email)')
    .order('period_start', { ascending: false });

  if (error) return { error: error.message };

  const targets = (data ?? []).map((t) => ({
    ...t,
    consultant: (t as unknown as Record<string, unknown>).user_profiles as ConsultantTarget['consultant'],
  })) as ConsultantTarget[];

  return { data: targets };
}

// =============================================================================
// Create Target
// =============================================================================

const createTargetSchema = z.object({
  consultant_id: z.string().uuid(),
  target_type: z.string().min(1),
  target_value: z.number().positive(),
  period_type: z.enum(['weekly', 'monthly']),
  period_start: z.string().min(1),
  period_end: z.string().min(1),
});

export async function createTarget(
  input: z.infer<typeof createTargetSchema>
): Promise<ActionResult<ConsultantTarget>> {
  const userId = await requireAdminOrManager();
  if (!userId) return { error: 'Admin or manager access required' };

  const parsed = createTargetSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('consultant_targets')
    .insert({
      consultant_id: parsed.data.consultant_id,
      target_type: parsed.data.target_type,
      target_value: parsed.data.target_value,
      period_type: parsed.data.period_type,
      period_start: parsed.data.period_start,
      period_end: parsed.data.period_end,
      created_by: userId,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAuditLog('target.create', 'consultant_targets', data.id, null, {
    consultant_id: parsed.data.consultant_id,
    target_type: parsed.data.target_type,
    target_value: parsed.data.target_value,
  });


  return { data: data as ConsultantTarget };
}

// =============================================================================
// Update Target
// =============================================================================

const updateTargetSchema = z.object({
  id: z.string().uuid(),
  target_value: z.number().positive().optional(),
  period_end: z.string().optional(),
});

export async function updateTarget(
  input: z.infer<typeof updateTargetSchema>
): Promise<ActionResult<ConsultantTarget>> {
  const userId = await requireAdminOrManager();
  if (!userId) return { error: 'Admin or manager access required' };

  const parsed = updateTargetSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  const { data: oldTarget } = await supabase
    .from('consultant_targets')
    .select('*')
    .eq('id', parsed.data.id)
    .single();

  const updates: Record<string, unknown> = {};
  if (parsed.data.target_value !== undefined) updates.target_value = parsed.data.target_value;
  if (parsed.data.period_end !== undefined) updates.period_end = parsed.data.period_end;

  const { data, error } = await supabase
    .from('consultant_targets')
    .update(updates)
    .eq('id', parsed.data.id)
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAuditLog(
    'target.update',
    'consultant_targets',
    parsed.data.id,
    oldTarget as Record<string, unknown> | null,
    updates
  );


  return { data: data as ConsultantTarget };
}

// =============================================================================
// Delete Target
// =============================================================================

export async function deleteTarget(targetId: string): Promise<ActionResult<void>> {
  const userId = await requireAdminOrManager();
  if (!userId) return { error: 'Admin or manager access required' };

  const supabase = await createClient();

  const { error } = await supabase
    .from('consultant_targets')
    .delete()
    .eq('id', targetId);

  if (error) return { error: error.message };

  await writeAuditLog('target.delete', 'consultant_targets', targetId);


  return { data: undefined };
}

// =============================================================================
// Bulk Set Team Targets
// =============================================================================

const bulkSetSchema = z.object({
  hierarchy_node_id: z.string().uuid(),
  target_type: z.string().min(1),
  target_value: z.number().positive(),
  period_type: z.enum(['weekly', 'monthly']),
  period_start: z.string().min(1),
  period_end: z.string().min(1),
});

export async function bulkSetTeamTargets(
  input: z.infer<typeof bulkSetSchema>
): Promise<ActionResult<{ count: number }>> {
  const userId = await requireAdminOrManager();
  if (!userId) return { error: 'Admin or manager access required' };

  const parsed = bulkSetSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  // Get all team members
  const { data: members, error: membersError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('hierarchy_node_id', parsed.data.hierarchy_node_id)
    .eq('is_active', true);

  if (membersError) return { error: membersError.message };
  if (!members?.length) return { error: 'No active members found in this team' };

  // Insert targets for all members
  const inserts = members.map((m) => ({
    consultant_id: m.id,
    target_type: parsed.data.target_type,
    target_value: parsed.data.target_value,
    period_type: parsed.data.period_type,
    period_start: parsed.data.period_start,
    period_end: parsed.data.period_end,
    created_by: userId,
  }));

  const { error } = await supabase
    .from('consultant_targets')
    .insert(inserts);

  if (error) return { error: error.message };

  await writeAuditLog('target.bulk_set', 'consultant_targets', undefined, null, {
    team_node_id: parsed.data.hierarchy_node_id,
    target_type: parsed.data.target_type,
    member_count: members.length,
  });


  return { data: { count: members.length } };
}
