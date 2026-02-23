import { NextResponse } from 'next/server';
import { getPool, closePool } from '@/lib/sync/sql-server';
import { buildLookupMaps, getServiceClient } from '@/lib/sync/lookups';
import {
  syncActivities,
  syncSubmissions,
  syncPlacements,
  syncJobOrders,
} from '@/lib/sync/sync-tables';
import { syncDeletedNotes } from '@/lib/sync/deleted-notes';
import type { SyncResult } from '@/lib/sync/types';

export const maxDuration = 300;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    return NextResponse.json(
      { skipped: true, reason: 'Sync already running', run_id: runningSync[0].id },
      { status: 200 }
    );
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
  console.log(`Incremental sync since: ${since || 'FULL (no previous run)'}`);

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
    console.log('Building lookup maps...');
    const lookups = await buildLookupMaps();

    // Run syncs sequentially (FK order matters)
    console.log('Syncing activities...');
    results.push(await syncActivities(pool, lookups, since));

    console.log('Syncing deleted notes...');
    results.push(await syncDeletedNotes(pool, since));

    console.log('Syncing submissions...');
    results.push(await syncSubmissions(pool, lookups, since));

    console.log('Syncing placements...');
    results.push(await syncPlacements(pool, lookups, since));

    console.log('Syncing job orders...');
    results.push(await syncJobOrders(pool, lookups, since));

    await closePool();

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

    return NextResponse.json({
      success: true,
      status,
      since,
      duration_ms: Date.now() - new Date(runStart).getTime(),
      totals: {
        processed: totalProcessed,
        inserted: totalInserted,
        errors: totalErrors,
      },
      tables: results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync failed:', message);

    await closePool();

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

    return NextResponse.json(
      { success: false, error: message, tables: results },
      { status: 500 }
    );
  }
}
