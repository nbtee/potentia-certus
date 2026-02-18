'use client';

import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/admin-data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuditLogs } from '@/lib/admin/hooks';
import { exportAuditLog } from './actions';
import type { AuditLogEntry } from '@/lib/admin/types';
import { Download, Eye } from 'lucide-react';

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-teal-100 text-teal-800',
  delete: 'bg-red-100 text-red-800',
  invite: 'bg-purple-100 text-purple-800',
};

function getActionColor(action: string): string {
  for (const [key, color] of Object.entries(actionColors)) {
    if (action.includes(key)) return color;
  }
  return 'bg-gray-100 text-gray-800';
}

export function AuditTable() {
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterTable, setFilterTable] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [detailEntry, setDetailEntry] = useState<AuditLogEntry | null>(null);

  const filters = {
    action: filterAction || undefined,
    tableName: filterTable || undefined,
    dateFrom: filterDateFrom || undefined,
    dateTo: filterDateTo || undefined,
    page,
  };

  const { data, isLoading } = useAuditLogs(filters);

  async function handleExport() {
    setExporting(true);
    const result = await exportAuditLog(filters);
    setExporting(false);

    if (result.data) {
      const blob = new Blob([result.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  const columns: ColumnDef<AuditLogEntry, unknown>[] = [
    {
      accessorKey: 'created_at',
      header: 'Timestamp',
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-500">
          {new Date(getValue() as string).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'user_email',
      header: 'User',
      cell: ({ getValue }) => (
        <span className="text-sm">{(getValue() as string) ?? '-'}</span>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ getValue }) => {
        const action = getValue() as string;
        return (
          <Badge variant="secondary" className={getActionColor(action)}>
            {action}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'table_name',
      header: 'Table',
      cell: ({ getValue }) => (
        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
          {(getValue() as string) ?? '-'}
        </code>
      ),
    },
    {
      accessorKey: 'record_id',
      header: 'Record',
      cell: ({ getValue }) => {
        const id = getValue() as string | null;
        return id ? (
          <span className="font-mono text-xs text-gray-400">
            {id.slice(0, 8)}...
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      id: 'details',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDetailEntry(row.original)}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Audit Log"
        description="Security audit trail of all administrative actions."
      >
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </AdminPageHeader>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="grid gap-1">
          <Label className="text-xs">Action</Label>
          <Input
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            placeholder="e.g. user.invite"
            className="h-8 w-40"
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Table</Label>
          <Select value={filterTable} onValueChange={setFilterTable}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder="All tables" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All tables</SelectItem>
              <SelectItem value="user_profiles">user_profiles</SelectItem>
              <SelectItem value="org_hierarchy">org_hierarchy</SelectItem>
              <SelectItem value="business_rules">business_rules</SelectItem>
              <SelectItem value="consultant_targets">consultant_targets</SelectItem>
              <SelectItem value="data_assets">data_assets</SelectItem>
              <SelectItem value="context_documents">context_documents</SelectItem>
              <SelectItem value="unmatched_terms">unmatched_terms</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="h-8 w-36"
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="h-8 w-36"
          />
        </div>
      </div>

      <AdminDataTable
        columns={columns}
        data={data?.entries ?? []}
        isLoading={isLoading}
        searchPlaceholder="Search logs..."
      />

      {/* Detail dialog */}
      <Dialog open={!!detailEntry} onOpenChange={(open) => !open && setDetailEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audit Entry Details</DialogTitle>
          </DialogHeader>
          {detailEntry && (
            <div className="grid gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-500">Timestamp:</span>{' '}
                {new Date(detailEntry.created_at).toLocaleString()}
              </div>
              <div>
                <span className="font-medium text-gray-500">User:</span>{' '}
                {detailEntry.user_email ?? detailEntry.user_id ?? '-'}
              </div>
              <div>
                <span className="font-medium text-gray-500">Action:</span>{' '}
                <Badge variant="secondary" className={getActionColor(detailEntry.action)}>
                  {detailEntry.action}
                </Badge>
              </div>
              <div>
                <span className="font-medium text-gray-500">Table:</span>{' '}
                {detailEntry.table_name ?? '-'}
              </div>
              <div>
                <span className="font-medium text-gray-500">Record ID:</span>{' '}
                <code className="text-xs">{detailEntry.record_id ?? '-'}</code>
              </div>
              {detailEntry.old_values && (
                <div>
                  <span className="font-medium text-gray-500">Old Values:</span>
                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs">
                    {JSON.stringify(detailEntry.old_values, null, 2)}
                  </pre>
                </div>
              )}
              {detailEntry.new_values && (
                <div>
                  <span className="font-medium text-gray-500">New Values:</span>
                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs">
                    {JSON.stringify(detailEntry.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
