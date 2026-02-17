'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminDataTable } from '@/components/admin/admin-data-table';
import { useIngestionStatus, useIngestionRuns } from '@/lib/admin/hooks';
import { triggerManualSync } from './actions';
import type { IngestionRun } from '@/lib/admin/types';
import { type ColumnDef } from '@tanstack/react-table';
import { RefreshCw, Database } from 'lucide-react';

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  running: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  partial: 'bg-amber-100 text-amber-800',
};

export function IngestionDashboard() {
  const { data: status, isLoading: statusLoading } = useIngestionStatus();
  const { data: runs, isLoading: runsLoading } = useIngestionRuns();
  const [syncing, setSyncing] = useState<string | null>(null);

  async function handleSync(sourceTable: string) {
    setSyncing(sourceTable);
    await triggerManualSync(sourceTable);
    setSyncing(null);
  }

  const columns: ColumnDef<IngestionRun, unknown>[] = [
    {
      accessorKey: 'source_table',
      header: 'Source',
      cell: ({ getValue }) => (
        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
          {getValue() as string}
        </code>
      ),
    },
    {
      accessorKey: 'run_type',
      header: 'Type',
      cell: ({ getValue }) => (
        <span className="text-sm">{(getValue() as string).replace(/_/g, ' ')}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const s = getValue() as string;
        return (
          <Badge variant="secondary" className={statusColors[s] ?? ''}>
            {s}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'records_processed',
      header: 'Processed',
      cell: ({ getValue }) => (
        <span className="font-mono text-sm">{(getValue() as number).toLocaleString()}</span>
      ),
    },
    {
      id: 'inserted_updated',
      header: 'Ins / Upd',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.records_inserted} / {row.original.records_updated}
        </span>
      ),
    },
    {
      accessorKey: 'records_failed',
      header: 'Failed',
      cell: ({ getValue }) => {
        const val = getValue() as number;
        return (
          <span className={`text-sm ${val > 0 ? 'font-medium text-red-600' : ''}`}>
            {val}
          </span>
        );
      },
    },
    {
      accessorKey: 'started_at',
      header: 'Started',
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-500">
          {new Date(getValue() as string).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'completed_at',
      header: 'Completed',
      cell: ({ getValue }) => {
        const val = getValue() as string | null;
        return val ? (
          <span className="text-xs text-gray-500">
            {new Date(val).toLocaleString()}
          </span>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        );
      },
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Ingestion Health"
        description="SQL Server sync status. Actual Edge Function sync requires Stage D credentials."
      />

      {/* Status cards */}
      {statusLoading ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(status ?? []).map((run) => (
            <Card key={run.source_table}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-gray-500" />
                  <CardTitle className="text-sm font-medium">
                    {run.source_table}
                  </CardTitle>
                </div>
                <Badge variant="secondary" className={statusColors[run.status] ?? ''}>
                  {run.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Records</span>
                    <span className="font-mono">{run.records_processed.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last sync</span>
                    <span className="text-xs">
                      {run.completed_at
                        ? new Date(run.completed_at).toLocaleString()
                        : 'In progress'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  disabled={syncing === run.source_table}
                  onClick={() => handleSync(run.source_table)}
                >
                  <RefreshCw className={`mr-2 h-3.5 w-3.5 ${syncing === run.source_table ? 'animate-spin' : ''}`} />
                  {syncing === run.source_table ? 'Syncing...' : 'Sync Now'}
                </Button>
              </CardContent>
            </Card>
          ))}

          {(status ?? []).length === 0 && (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-gray-500">
                No ingestion runs yet. Waiting for Stage D credentials.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Run history */}
      <h2 className="mb-3 text-lg font-semibold">Run History</h2>
      <AdminDataTable
        columns={columns}
        data={runs ?? []}
        isLoading={runsLoading}
        searchPlaceholder="Search runs..."
        searchColumn="source_table"
      />
    </div>
  );
}
