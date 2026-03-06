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
import type { SyncResult, LookupMaps } from '../shared/types.js';
import type sql from 'mssql';

// ---------------------------------------------------------------------------
// Table sync definitions — each gets its own watermark
// ---------------------------------------------------------------------------

interface SyncTask {
  name: string;
  targetTable: string;
  sourceTable: string;
  alwaysFullSync?: boolean;
  run: (
    pool: sql.ConnectionPool,
    lookups: LookupMaps,
    since: string | null
  ) => Promise<SyncResult[]>;
}

const SYNC_TASKS: SyncTask[] = [
  {
    name: 'activities',
    targetTable: 'activities',
    sourceTable: 'TargetJobsDB.Notes',
    run: async (pool, lookups, since) => {
      const activityResult = await syncActivities(pool, lookups, since);
      const deleteResult = await syncDeletedNotes(pool, since);
      return [activityResult, deleteResult];
    },
  },
  {
    name: 'submissions',
    targetTable: 'submission_status_log',
    sourceTable: 'TargetJobsDB.SubmissionHistory',
    run: async (pool, lookups, since) => [
      await syncSubmissions(pool, lookups, since),
    ],
  },
  {
    name: 'placements',
    targetTable: 'placements',
    sourceTable: 'TargetJobsDB.Placements',
    alwaysFullSync: true, // No modification timestamp — always re-sync all (~550 rows)
    run: async (pool, lookups, since) => [
      await syncPlacements(pool, lookups, since),
    ],
  },
  {
    name: 'job_orders',
    targetTable: 'job_orders',
    sourceTable: 'TargetJobsDB.JobOrders',
    run: async (pool, lookups, since) => [
      await syncJobOrders(pool, lookups, since),
    ],
  },
];

// ---------------------------------------------------------------------------
// Stale run cleanup — mark runs stuck in "running" for > 15 min as "stale"
// ---------------------------------------------------------------------------

async function cleanupStaleRuns(): Promise<number> {
  const supabase = getServiceClient();
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('ingestion_runs')
    .update({
      status: 'stale',
      error_message: 'Run exceeded 15-minute timeout — marked stale automatically',
      completed_at: new Date().toISOString(),
    })
    .eq('status', 'running')
    .lt('started_at', cutoff)
    .select('id');

  return data?.length ?? 0;
}

// ---------------------------------------------------------------------------
// Per-table watermark — last successful completed_at for this target_table
// ---------------------------------------------------------------------------

async function getTableWatermark(targetTable: string): Promise<string | null> {
  const supabase = getServiceClient();

  const { data } = await supabase
    .from('ingestion_runs')
    .select('completed_at')
    .eq('target_table', targetTable)
    .in('status', ['completed'])
    .order('completed_at', { ascending: false })
    .limit(1);

  return data?.[0]?.completed_at ?? null;
}

// ---------------------------------------------------------------------------
// Main sync orchestrator
// ---------------------------------------------------------------------------

async function syncData(timer: Timer, context: InvocationContext): Promise<void> {
  context.log('Incremental sync triggered', timer.isPastDue ? '(past due)' : '');

  const supabase = getServiceClient();

  // 1. Clean up stale runs
  const staleCount = await cleanupStaleRuns();
  if (staleCount > 0) {
    context.log(`Cleaned up ${staleCount} stale run(s)`);
  }

  // 2. Concurrency guard: check for running sync less than 10 min old
  const { data: runningSync } = await supabase
    .from('ingestion_runs')
    .select('id, started_at')
    .eq('status', 'running')
    .eq('run_type', 'incremental_sync')
    .gte('started_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .limit(1);

  if (runningSync && runningSync.length > 0) {
    context.log(`Skipping: sync already running (run_id: ${runningSync[0].id})`);
    return;
  }

  try {
    // 3. Connect to SQL Server + build lookup maps
    const pool = await getPool();
    context.log('Building lookup maps...');
    const lookups = await buildLookupMaps();

    // 4. Run each table sync with its own watermark
    for (const task of SYNC_TASKS) {
      const since = task.alwaysFullSync ? null : await getTableWatermark(task.targetTable);
      context.log(`Syncing ${task.name} (since: ${since || 'FULL'})...`);

      // Create per-table ingestion_run record
      const runStart = new Date().toISOString();
      const { data: runRecord } = await supabase
        .from('ingestion_runs')
        .insert({
          run_type: 'incremental_sync',
          source_table: task.sourceTable,
          target_table: task.targetTable,
          status: 'running',
          started_at: runStart,
        })
        .select('id')
        .single();

      const runId = runRecord?.id;

      try {
        const results = await task.run(pool, lookups, since);

        const totalProcessed = results.reduce((s, r) => s + r.processed, 0);
        const totalInserted = results.reduce((s, r) => s + r.inserted, 0);
        const totalErrors = results.reduce((s, r) => s + r.errors, 0);
        const totalDuration = results.reduce((s, r) => s + r.duration_ms, 0);
        const status = totalErrors === 0 ? 'completed' : 'partial';

        if (runId) {
          await supabase
            .from('ingestion_runs')
            .update({
              records_processed: totalProcessed,
              records_inserted: totalInserted,
              records_failed: totalErrors,
              status,
              completed_at: new Date().toISOString(),
              metadata: { subtasks: results },
            })
            .eq('id', runId);
        }

        context.log(
          `  ${task.name} ${status}: ${totalProcessed} processed, ${totalInserted} upserted, ${totalErrors} errors (${totalDuration}ms)`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        context.error(`  ${task.name} FAILED: ${message}`);

        if (runId) {
          await supabase
            .from('ingestion_runs')
            .update({
              status: 'failed',
              error_message: message,
              completed_at: new Date().toISOString(),
            })
            .eq('id', runId);
        }
        // Continue to next table — don't let one failure stop the rest
      }
    }
  } catch (error) {
    // Connection-level failure (SQL Server down, lookup build failed)
    const message = error instanceof Error ? error.message : 'Unknown error';
    context.error('Sync infrastructure failed:', message);

    // Log a single failed run so we know the timer fired
    await supabase
      .from('ingestion_runs')
      .insert({
        run_type: 'incremental_sync',
        source_table: '*',
        target_table: '*',
        status: 'failed',
        error_message: message,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
  } finally {
    await closePool().catch(() => {});
  }
}

app.timer('sync-data', {
  schedule: '0 */15 * * * *', // Every 15 minutes
  handler: syncData,
});
