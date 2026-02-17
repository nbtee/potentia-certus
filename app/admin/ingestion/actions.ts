'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/admin/audit';
import type { IngestionRun } from '@/lib/admin/types';

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
// Get Ingestion Status (latest run per source_table)
// =============================================================================

export async function getIngestionStatus(): Promise<ActionResult<IngestionRun[]>> {
  const userId = await requireAdminOrManager();
  if (!userId) return { error: 'Admin or manager access required' };

  const supabase = await createClient();

  // Get latest run per source_table using distinct on
  const { data, error } = await supabase
    .from('ingestion_runs')
    .select('*')
    .order('source_table')
    .order('started_at', { ascending: false });

  if (error) return { error: error.message };

  // Group by source_table, take latest
  const latestBySource = new Map<string, IngestionRun>();
  for (const run of (data ?? []) as IngestionRun[]) {
    if (!latestBySource.has(run.source_table)) {
      latestBySource.set(run.source_table, run);
    }
  }

  return { data: Array.from(latestBySource.values()) };
}

// =============================================================================
// List Ingestion Runs (paginated)
// =============================================================================

export async function listIngestionRuns(
  limit = 50
): Promise<ActionResult<IngestionRun[]>> {
  const userId = await requireAdminOrManager();
  if (!userId) return { error: 'Admin or manager access required' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ingestion_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) return { error: error.message };
  return { data: (data ?? []) as IngestionRun[] };
}

// =============================================================================
// Trigger Manual Sync (placeholder — inserts a running record)
// =============================================================================

export async function triggerManualSync(
  sourceTable: string
): Promise<ActionResult<IngestionRun>> {
  const userId = await requireAdminOrManager();
  if (!userId) return { error: 'Admin or manager access required' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ingestion_runs')
    .insert({
      run_type: 'incremental_sync',
      source_table: sourceTable,
      target_table: sourceTable,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAuditLog('ingestion.manual_trigger', 'ingestion_runs', data.id, null, {
    source_table: sourceTable,
  });

  revalidatePath('/admin/ingestion');
  return { data: data as IngestionRun };
}
