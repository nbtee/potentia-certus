'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { writeAuditLog } from '@/lib/admin/audit';
import type { BusinessRule } from '@/lib/admin/types';

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
// List
// =============================================================================

export async function listBusinessRules(): Promise<ActionResult<BusinessRule[]>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('business_rules')
    .select('*')
    .order('rule_type')
    .order('effective_from', { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []) as BusinessRule[] };
}

// =============================================================================
// Create
// =============================================================================

const createRuleSchema = z.object({
  rule_type: z.string().min(1),
  rule_key: z.string().min(1),
  rule_value: z.record(z.unknown()),
  effective_from: z.string().min(1),
  effective_until: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export async function createBusinessRule(
  input: z.infer<typeof createRuleSchema>
): Promise<ActionResult<BusinessRule>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const parsed = createRuleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('business_rules')
    .insert({
      rule_type: parsed.data.rule_type,
      rule_key: parsed.data.rule_key,
      rule_value: parsed.data.rule_value,
      effective_from: parsed.data.effective_from,
      effective_until: parsed.data.effective_until ?? null,
      description: parsed.data.description ?? null,
      created_by: adminId,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAuditLog('rule.create', 'business_rules', data.id, null, {
    rule_type: parsed.data.rule_type,
    rule_key: parsed.data.rule_key,
  });

  revalidatePath('/admin/rules');
  return { data: data as BusinessRule };
}

// =============================================================================
// Update
// =============================================================================

const updateRuleSchema = z.object({
  id: z.string().uuid(),
  rule_value: z.record(z.unknown()).optional(),
  effective_until: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export async function updateBusinessRule(
  input: z.infer<typeof updateRuleSchema>
): Promise<ActionResult<BusinessRule>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const parsed = updateRuleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  const { data: oldRule } = await supabase
    .from('business_rules')
    .select('*')
    .eq('id', parsed.data.id)
    .single();

  const updates: Record<string, unknown> = {};
  if (parsed.data.rule_value !== undefined) updates.rule_value = parsed.data.rule_value;
  if (parsed.data.effective_until !== undefined) updates.effective_until = parsed.data.effective_until;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;

  const { data, error } = await supabase
    .from('business_rules')
    .update(updates)
    .eq('id', parsed.data.id)
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAuditLog(
    'rule.update',
    'business_rules',
    parsed.data.id,
    oldRule as Record<string, unknown> | null,
    updates
  );

  revalidatePath('/admin/rules');
  return { data: data as BusinessRule };
}

// =============================================================================
// Delete
// =============================================================================

export async function deleteBusinessRule(ruleId: string): Promise<ActionResult<void>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const supabase = await createClient();

  const { data: oldRule } = await supabase
    .from('business_rules')
    .select('*')
    .eq('id', ruleId)
    .single();

  const { error } = await supabase
    .from('business_rules')
    .delete()
    .eq('id', ruleId);

  if (error) return { error: error.message };

  await writeAuditLog(
    'rule.delete',
    'business_rules',
    ruleId,
    oldRule as Record<string, unknown> | null,
    null
  );

  revalidatePath('/admin/rules');
  return { data: undefined };
}
