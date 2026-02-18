'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { writeAuditLog } from '@/lib/admin/audit';
import type { UnmatchedTerm } from '@/lib/admin/types';

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
// List Unmatched Terms
// =============================================================================

export async function listUnmatchedTerms(): Promise<ActionResult<UnmatchedTerm[]>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('unmatched_terms')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []) as UnmatchedTerm[] };
}

// =============================================================================
// Resolve Unmatched Term (assign to asset or dismiss)
// =============================================================================

const resolveSchema = z.object({
  id: z.string().uuid(),
  data_asset_id: z.string().uuid().optional(), // If provided, adds as synonym
  action: z.enum(['assign', 'dismiss']),
});

export async function resolveUnmatchedTerm(
  input: z.infer<typeof resolveSchema>
): Promise<ActionResult<void>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const parsed = resolveSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  // Get the unmatched term
  const { data: term } = await supabase
    .from('unmatched_terms')
    .select('*')
    .eq('id', parsed.data.id)
    .single();

  if (!term) return { error: 'Term not found' };

  if (parsed.data.action === 'assign' && parsed.data.data_asset_id) {
    // Add the term as a synonym to the data asset
    const { data: asset } = await supabase
      .from('data_assets')
      .select('synonyms')
      .eq('id', parsed.data.data_asset_id)
      .single();

    if (!asset) return { error: 'Data asset not found' };

    const currentSynonyms = (asset.synonyms as string[]) ?? [];
    if (!currentSynonyms.includes(term.unmatched_term)) {
      const { error: updateError } = await supabase
        .from('data_assets')
        .update({ synonyms: [...currentSynonyms, term.unmatched_term] })
        .eq('id', parsed.data.data_asset_id);

      if (updateError) return { error: updateError.message };
    }

    // Update the unmatched term status
    const { error } = await supabase
      .from('unmatched_terms')
      .update({
        resolution_status: 'added_synonym',
        suggested_data_asset_id: parsed.data.data_asset_id,
        resolved_by: adminId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.id);

    if (error) return { error: error.message };

    await writeAuditLog('synonym.assign', 'unmatched_terms', parsed.data.id, null, {
      term: term.unmatched_term,
      asset_id: parsed.data.data_asset_id,
    });
  } else {
    // Dismiss
    const { error } = await supabase
      .from('unmatched_terms')
      .update({
        resolution_status: 'ignored',
        resolved_by: adminId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.id);

    if (error) return { error: error.message };

    await writeAuditLog('synonym.dismiss', 'unmatched_terms', parsed.data.id);
  }


  return { data: undefined };
}

// =============================================================================
// Bulk Dismiss
// =============================================================================

export async function bulkDismissTerms(termIds: string[]): Promise<ActionResult<void>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  if (!termIds.length) return { error: 'No terms specified' };

  const supabase = await createClient();

  const { error } = await supabase
    .from('unmatched_terms')
    .update({
      resolution_status: 'ignored',
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .in('id', termIds);

  if (error) return { error: error.message };

  await writeAuditLog('synonym.bulk_dismiss', 'unmatched_terms', undefined, null, {
    count: termIds.length,
  });


  return { data: undefined };
}
