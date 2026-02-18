'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { writeAuditLog } from '@/lib/admin/audit';
import type { DataAsset } from '@/lib/admin/types';

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
// List Data Assets (with widget usage count)
// =============================================================================

export async function listDataAssets(): Promise<ActionResult<DataAsset[]>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const supabase = await createClient();

  const { data: assets, error } = await supabase
    .from('data_assets')
    .select('*')
    .order('category')
    .order('display_name');

  if (error) return { error: error.message };

  // Get widget usage counts
  const { data: widgetCounts } = await supabase
    .from('dashboard_widgets')
    .select('data_asset_id');

  const countMap = new Map<string, number>();
  for (const w of widgetCounts ?? []) {
    const id = w.data_asset_id as string;
    countMap.set(id, (countMap.get(id) ?? 0) + 1);
  }

  const result = (assets ?? []).map((a) => ({
    ...a,
    widget_count: countMap.get(a.id) ?? 0,
  })) as DataAsset[];

  return { data: result };
}

// =============================================================================
// Create Data Asset
// =============================================================================

const createAssetSchema = z.object({
  asset_key: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().nullable().optional(),
  synonyms: z.array(z.string()).optional(),
  category: z.enum(['activity', 'revenue', 'pipeline', 'performance']),
  output_shapes: z.array(z.string()).min(1),
  available_dimensions: z.array(z.string()).optional(),
  available_filters: z.array(z.string()).optional(),
});

export async function createDataAsset(
  input: z.infer<typeof createAssetSchema>
): Promise<ActionResult<DataAsset>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const parsed = createAssetSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('data_assets')
    .insert({
      asset_key: parsed.data.asset_key,
      display_name: parsed.data.display_name,
      description: parsed.data.description ?? null,
      synonyms: parsed.data.synonyms ?? [],
      category: parsed.data.category,
      output_shapes: parsed.data.output_shapes,
      available_dimensions: parsed.data.available_dimensions ?? [],
      available_filters: parsed.data.available_filters ?? [],
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAuditLog('data_asset.create', 'data_assets', data.id, null, {
    asset_key: parsed.data.asset_key,
  });


  return { data: data as DataAsset };
}

// =============================================================================
// Update Data Asset
// =============================================================================

const updateAssetSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  synonyms: z.array(z.string()).optional(),
  output_shapes: z.array(z.string()).optional(),
  available_dimensions: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export async function updateDataAsset(
  input: z.infer<typeof updateAssetSchema>
): Promise<ActionResult<DataAsset>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const parsed = updateAssetSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  const { data: oldAsset } = await supabase
    .from('data_assets')
    .select('*')
    .eq('id', parsed.data.id)
    .single();

  const updates: Record<string, unknown> = {};
  if (parsed.data.display_name !== undefined) updates.display_name = parsed.data.display_name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.synonyms !== undefined) updates.synonyms = parsed.data.synonyms;
  if (parsed.data.output_shapes !== undefined) updates.output_shapes = parsed.data.output_shapes;
  if (parsed.data.available_dimensions !== undefined)
    updates.available_dimensions = parsed.data.available_dimensions;
  if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active;

  const { data, error } = await supabase
    .from('data_assets')
    .update(updates)
    .eq('id', parsed.data.id)
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAuditLog(
    'data_asset.update',
    'data_assets',
    parsed.data.id,
    oldAsset as Record<string, unknown> | null,
    updates
  );


  return { data: data as DataAsset };
}
