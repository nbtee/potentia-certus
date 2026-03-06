import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
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

// Table name → sync function mapping
const TABLE_SYNCS: Record<
  string,
  {
    sourceTable: string;
    targetTable: string;
    run: (pool: sql.ConnectionPool, lookups: LookupMaps, since: string | null) => Promise<SyncResult[]>;
  }
> = {
  activities: {
    sourceTable: 'TargetJobsDB.Notes',
    targetTable: 'activities',
    run: async (pool, lookups, since) => [
      await syncActivities(pool, lookups, since),
      await syncDeletedNotes(pool, since),
    ],
  },
  submissions: {
    sourceTable: 'TargetJobsDB.SubmissionHistory',
    targetTable: 'submission_status_log',
    run: async (pool, lookups, since) => [
      await syncSubmissions(pool, lookups, since),
    ],
  },
  placements: {
    sourceTable: 'TargetJobsDB.Placements',
    targetTable: 'placements',
    run: async (pool, lookups, since) => [
      await syncPlacements(pool, lookups, since),
    ],
  },
  job_orders: {
    sourceTable: 'TargetJobsDB.JobOrders',
    targetTable: 'job_orders',
    run: async (pool, lookups, since) => [
      await syncJobOrders(pool, lookups, since),
    ],
  },
};

async function syncDataHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const tables = (body.tables as string[] | undefined) ?? Object.keys(TABLE_SYNCS);
  const fullSync = (body.full_sync as boolean) ?? false;

  // Validate table names
  const invalid = tables.filter((t) => !(t in TABLE_SYNCS));
  if (invalid.length > 0) {
    return {
      status: 400,
      jsonBody: { error: `Unknown tables: ${invalid.join(', ')}`, valid: Object.keys(TABLE_SYNCS) },
    };
  }

  context.log(`Manual sync triggered for: ${tables.join(', ')} (full_sync: ${fullSync})`);

  const supabase = getServiceClient();
  const results: Record<string, { status: string; results?: SyncResult[]; error?: string }> = {};

  try {
    const pool = await getPool();
    const lookups = await buildLookupMaps();

    for (const tableName of tables) {
      const task = TABLE_SYNCS[tableName];

      // Get per-table watermark (unless full sync requested)
      let since: string | null = null;
      if (!fullSync) {
        const { data } = await supabase
          .from('ingestion_runs')
          .select('completed_at')
          .eq('target_table', task.targetTable)
          .in('status', ['completed'])
          .order('completed_at', { ascending: false })
          .limit(1);
        since = data?.[0]?.completed_at ?? null;
      }

      // Create ingestion_run record
      const runStart = new Date().toISOString();
      const { data: runRecord } = await supabase
        .from('ingestion_runs')
        .insert({
          run_type: fullSync ? 'full_sync' : 'incremental_sync',
          source_table: task.sourceTable,
          target_table: task.targetTable,
          status: 'running',
          started_at: runStart,
        })
        .select('id')
        .single();

      const runId = runRecord?.id;

      try {
        const syncResults = await task.run(pool, lookups, since);

        const totalProcessed = syncResults.reduce((s, r) => s + r.processed, 0);
        const totalInserted = syncResults.reduce((s, r) => s + r.inserted, 0);
        const totalErrors = syncResults.reduce((s, r) => s + r.errors, 0);
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
              metadata: { subtasks: syncResults, manual: true },
            })
            .eq('id', runId);
        }

        results[tableName] = { status, results: syncResults };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
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
        results[tableName] = { status: 'failed', error: message };
      }
    }

    return { status: 200, jsonBody: { tables: results } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    context.error('Manual sync failed:', message);
    return {
      status: 500,
      jsonBody: { error: 'Sync infrastructure failed. Check Azure Function logs.' },
    };
  } finally {
    await closePool().catch(() => {});
  }
}

app.http('sync-data-http', {
  methods: ['POST'],
  authLevel: 'function',
  handler: syncDataHttp,
});
