'use server';

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
// Get Ingestion Status (latest run per target_table)
// =============================================================================

export async function getIngestionStatus(): Promise<ActionResult<IngestionRun[]>> {
  const userId = await requireAdminOrManager();
  if (!userId) return { error: 'Admin or manager access required' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ingestion_runs')
    .select('*')
    .order('target_table')
    .order('started_at', { ascending: false });

  if (error) return { error: error.message };

  // Group by target_table, take latest
  const latestByTarget = new Map<string, IngestionRun>();
  for (const run of (data ?? []) as IngestionRun[]) {
    if (!latestByTarget.has(run.target_table)) {
      latestByTarget.set(run.target_table, run);
    }
  }

  return { data: Array.from(latestByTarget.values()) };
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
// Trigger Manual Sync via Azure Function HTTP trigger
// =============================================================================

export async function triggerManualSync(
  tables?: string[]
): Promise<ActionResult<{ message: string }>> {
  const userId = await requireAdminOrManager();
  if (!userId) return { error: 'Admin or manager access required' };

  const functionUrl = process.env.AZURE_SYNC_FUNCTION_URL;
  const functionKey = process.env.AZURE_SYNC_FUNCTION_KEY;

  if (!functionUrl || !functionKey) {
    return { error: 'Azure sync function not configured. Set AZURE_SYNC_FUNCTION_URL and AZURE_SYNC_FUNCTION_KEY.' };
  }

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-functions-key': functionKey,
      },
      body: JSON.stringify({
        ...(tables && { tables }),
        full_sync: false,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { error: (body as Record<string, string>).error || `Azure Function returned ${response.status}` };
    }

    await writeAuditLog('ingestion.manual_trigger', 'ingestion_runs', undefined, null, {
      tables: tables ?? ['all'],
      triggered_by: userId,
    });

    return { data: { message: `Sync triggered for ${tables?.join(', ') || 'all tables'}` } };
  } catch (err) {
    return { error: `Failed to reach Azure Function: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

// =============================================================================
// Trigger Full Re-sync (all tables, no watermark)
// =============================================================================

export async function triggerFullResync(
  tables?: string[]
): Promise<ActionResult<{ message: string }>> {
  const userId = await requireAdminOrManager();
  if (!userId) return { error: 'Admin or manager access required' };

  const functionUrl = process.env.AZURE_SYNC_FUNCTION_URL;
  const functionKey = process.env.AZURE_SYNC_FUNCTION_KEY;

  if (!functionUrl || !functionKey) {
    return { error: 'Azure sync function not configured.' };
  }

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-functions-key': functionKey,
      },
      body: JSON.stringify({
        ...(tables && { tables }),
        full_sync: true,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { error: (body as Record<string, string>).error || `Azure Function returned ${response.status}` };
    }

    await writeAuditLog('ingestion.full_resync', 'ingestion_runs', undefined, null, {
      tables: tables ?? ['all'],
      triggered_by: userId,
    });

    return { data: { message: `Full re-sync triggered for ${tables?.join(', ') || 'all tables'}` } };
  } catch (err) {
    return { error: `Failed to reach Azure Function: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}
