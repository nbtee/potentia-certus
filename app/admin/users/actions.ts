'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { writeAuditLog } from '@/lib/admin/audit';
import type { UserProfile } from '@/lib/admin/types';

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
// List Users
// =============================================================================

export async function listUsers(): Promise<ActionResult<UserProfile[]>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*, org_hierarchy!user_profiles_hierarchy_node_id_fkey(id, name, hierarchy_level)')
    .order('last_name', { ascending: true });

  if (error) return { error: error.message };

  const users = (data ?? []).map((u) => ({
    ...u,
    hierarchy_node: (u as unknown as Record<string, unknown>).org_hierarchy as UserProfile['hierarchy_node'],
  })) as UserProfile[];

  return { data: users };
}

// =============================================================================
// Invite User (dev: creates auth user + profile)
// =============================================================================

const inviteSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: z.enum(['consultant', 'team_lead', 'manager', 'admin']),
  hierarchy_node_id: z.string().uuid().nullable().optional(),
});

export async function inviteUser(
  input: z.infer<typeof inviteSchema>
): Promise<ActionResult<UserProfile>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  // In dev mode, create user via signUp (production would use invite)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: crypto.randomUUID(), // Random password for dev
  });

  if (authError) return { error: authError.message };
  if (!authData.user) return { error: 'Failed to create auth user' };

  // Update the profile that was auto-created by trigger
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      display_name: `${parsed.data.first_name} ${parsed.data.last_name}`,
      role: parsed.data.role,
      hierarchy_node_id: parsed.data.hierarchy_node_id ?? null,
    })
    .eq('id', authData.user.id)
    .select()
    .single();

  if (profileError) return { error: profileError.message };

  await writeAuditLog('user.invite', 'user_profiles', profile.id, null, {
    email: parsed.data.email,
    role: parsed.data.role,
  });


  return { data: profile as UserProfile };
}

// =============================================================================
// Update User
// =============================================================================

const updateUserSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  role: z.enum(['consultant', 'team_lead', 'manager', 'admin']).optional(),
  hierarchy_node_id: z.string().uuid().nullable().optional(),
});

export async function updateUser(
  input: z.infer<typeof updateUserSchema>
): Promise<ActionResult<UserProfile>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  // Fetch old values for audit
  const { data: oldProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', parsed.data.id)
    .single();

  const updates: Record<string, unknown> = {};
  if (parsed.data.first_name !== undefined) updates.first_name = parsed.data.first_name;
  if (parsed.data.last_name !== undefined) updates.last_name = parsed.data.last_name;
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if (parsed.data.hierarchy_node_id !== undefined)
    updates.hierarchy_node_id = parsed.data.hierarchy_node_id;

  if (parsed.data.first_name || parsed.data.last_name) {
    const fn = parsed.data.first_name ?? oldProfile?.first_name ?? '';
    const ln = parsed.data.last_name ?? oldProfile?.last_name ?? '';
    updates.display_name = `${fn} ${ln}`;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', parsed.data.id)
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAuditLog(
    'user.update',
    'user_profiles',
    parsed.data.id,
    oldProfile as Record<string, unknown> | null,
    updates
  );


  return { data: data as UserProfile };
}

// =============================================================================
// Deactivate User
// =============================================================================

export async function deactivateUser(
  userId: string
): Promise<ActionResult<void>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const supabase = await createClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({ is_active: false, deactivated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) return { error: error.message };

  await writeAuditLog('user.deactivate', 'user_profiles', userId);


  return { data: undefined };
}

// =============================================================================
// Reactivate User
// =============================================================================

export async function reactivateUser(
  userId: string
): Promise<ActionResult<void>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const supabase = await createClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({ is_active: true, deactivated_at: null })
    .eq('id', userId);

  if (error) return { error: error.message };

  await writeAuditLog('user.reactivate', 'user_profiles', userId);


  return { data: undefined };
}
