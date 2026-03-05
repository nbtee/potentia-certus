import { app, type InvocationContext, type Timer } from '@azure/functions';
import { getPool, closePool } from '../shared/sql-server.js';
import { buildLookupMaps, getServiceClient } from '../shared/lookups.js';
import {
  syncActivities,
  syncSubmissions,
  syncPlacements,
  syncJobOrders,
} from '../shared/sync-tables.js';
import { syncDeletedNotes } from '../shared/deleted-notes.js';
import type { SyncResult } from '../shared/types.js';

async function syncData(timer: Timer, context: InvocationContext): Promise<void> {
  context.log('Incremental sync triggered', timer.isPastDue ? '(past due)' : '');

  const supabase = getServiceClient();
  const runStart = new Date().toISOString();

  // Concurrency guard: check for running sync less than 10 min old
  const { data: runningSync } = await supabase
    .from('ingestion_runs')
    .select('id, started_at')
    .eq('status', 'running')
    .gte(
      'started_at',
      new Date(Date.now() - 10 * 60 * 1000).toISOString()
    )
    .limit(1);

  if (runningSync && runningSync.length > 0) {
    context.log(`Skipping: sync already running (run_id: ${runningSync[0].id})`);
    return;
  }

  // Find last successful sync timestamp
  const { data: lastRun } = await supabase
    .from('ingestion_runs')
    .select('completed_at')
    .in('run_type', ['incremental_sync', 'full_sync'])
    .in('status', ['completed', 'partial'])
    .order('completed_at', { ascending: false })
    .limit(1);

  const since = lastRun?.[0]?.completed_at || null;
  context.log(`Incremental sync since: ${since || 'FULL (no previous run)'}`);

  // Log run start
  const { data: runRecord } = await supabase
    .from('ingestion_runs')
    .insert({
      run_type: 'incremental_sync',
      source_table: 'TargetJobsDB.*',
      target_table: '*',
      status: 'running',
      started_at: runStart,
    })
    .select('id')
    .single();

  const runId = runRecord?.id;
  const results: SyncResult[] = [];

  try {
    // Connect to SQL Server
    const pool = await getPool();

    // Build lookup maps
    context.log('Building lookup maps...');
    const lookups = await buildLookupMaps();

    // Run syncs sequentially (FK order matters)
    context.log('Syncing activities...');
    results.push(await syncActivities(pool, lookups, since));

    context.log('Syncing deleted notes...');
    results.push(await syncDeletedNotes(pool, since));

    context.log('Syncing submissions...');
    results.push(await syncSubmissions(pool, lookups, since));

    context.log('Syncing placements...');
    results.push(await syncPlacements(pool, lookups, since));

    context.log('Syncing job orders...');
    results.push(await syncJobOrders(pool, lookups, since));

    // Determine overall status
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
    const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0);
    const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
    const status = totalErrors === 0 ? 'completed' : 'partial';

    // Update run record
    if (runId) {
      await supabase
        .from('ingestion_runs')
        .update({
          records_processed: totalProcessed,
          records_inserted: totalInserted,
          records_failed: totalErrors,
          status,
          completed_at: new Date().toISOString(),
          metadata: { tables: results },
        })
        .eq('id', runId);
    }

    context.log(
      `Sync ${status}: ${totalProcessed} processed, ${totalInserted} inserted, ${totalErrors} errors (${Date.now() - new Date(runStart).getTime()}ms)`
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    context.error('Sync failed:', message);

    // Update run record with failure
    if (runId) {
      await supabase
        .from('ingestion_runs')
        .update({
          status: 'failed',
          error_message: message,
          completed_at: new Date().toISOString(),
          metadata: { tables: results },
        })
        .eq('id', runId);
    }
  } finally {
    await closePool().catch(() => {});
  }
}

app.timer('sync-data', {
  schedule: '0 */15 * * * *', // Every 15 minutes
  handler: syncData,
});
