import type sql from 'mssql';
import type { SyncResult } from './types.js';
import { getServiceClient } from './lookups.js';

const BATCH_SIZE = 500;

/**
 * Sync deleted notes by scanning ALL isDeleted=1 IDs from SQL Server
 * and removing matching activities from Supabase.
 *
 * We always scan all deleted IDs (no date filter) because a note can be
 * deleted long after its dateAdded, and Notes lacks a reliable modification
 * timestamp we can filter on.
 *
 * This is safe because:
 * - We only SELECT Id (lightweight)
 * - Deletes are idempotent (deleting non-existent rows is a no-op)
 * - The deleted set is typically small relative to total notes
 */
export async function syncDeletedNotes(
  pool: sql.ConnectionPool,
  _since: string | null
): Promise<SyncResult> {
  const start = Date.now();

  const result = await pool.request().query(`
    SELECT Id FROM TargetJobsDB.Notes WHERE isDeleted = 1
  `);

  const bullhornIds = result.recordset.map(
    (r: Record<string, unknown>) => r.Id as number
  );

  if (bullhornIds.length === 0) {
    console.log('  deleted notes: 0 to remove');
    return {
      table: 'activities (deletes)',
      processed: 0,
      inserted: 0,
      errors: 0,
      duration_ms: Date.now() - start,
    };
  }

  const supabase = getServiceClient();
  let deleted = 0;
  let errors = 0;

  for (let i = 0; i < bullhornIds.length; i += BATCH_SIZE) {
    const batch = bullhornIds.slice(i, i + BATCH_SIZE);
    const { error, count } = await supabase
      .from('activities')
      .delete({ count: 'exact' })
      .in('bullhorn_id', batch);

    if (error) {
      console.error(`  ERROR deleting activities batch: ${error.message}`);
      errors += batch.length;
    } else {
      deleted += count || 0;
    }
  }

  console.log(
    `  deleted notes: ${deleted} removed from ${bullhornIds.length} deleted IDs, ${errors} errors (${Date.now() - start}ms)`
  );

  return {
    table: 'activities (deletes)',
    processed: bullhornIds.length,
    inserted: deleted,
    errors,
    duration_ms: Date.now() - start,
  };
}
