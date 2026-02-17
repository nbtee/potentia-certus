'use client';

import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/admin-data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useUnmatchedTerms,
  useResolveUnmatchedTerm,
  useBulkDismissTerms,
  useAdminDataAssets,
} from '@/lib/admin/hooks';
import type { UnmatchedTerm } from '@/lib/admin/types';
import { Link2, X } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  added_synonym: 'bg-green-100 text-green-800',
  ignored: 'bg-gray-100 text-gray-600',
  new_asset_created: 'bg-blue-100 text-blue-800',
};

export function SynonymTable() {
  const { data: terms, isLoading } = useUnmatchedTerms();
  const { data: assets } = useAdminDataAssets();
  const resolveMutation = useResolveUnmatchedTerm();
  const bulkDismissMutation = useBulkDismissTerms();

  const [selectedAssetId, setSelectedAssetId] = useState<Record<string, string>>({});

  const pendingTerms = (terms ?? []).filter((t) => t.resolution_status === 'pending');

  function handleAssign(termId: string) {
    const assetId = selectedAssetId[termId];
    if (!assetId) return;

    resolveMutation.mutate({
      id: termId,
      data_asset_id: assetId,
      action: 'assign',
    });
  }

  function handleDismiss(termId: string) {
    resolveMutation.mutate({
      id: termId,
      action: 'dismiss',
    });
  }

  function handleBulkDismiss() {
    const ids = pendingTerms.map((t) => t.id);
    if (ids.length > 0) {
      bulkDismissMutation.mutate(ids);
    }
  }

  const columns: ColumnDef<UnmatchedTerm, unknown>[] = [
    {
      accessorKey: 'unmatched_term',
      header: 'Term',
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'user_query',
      header: 'User Query',
      cell: ({ getValue }) => (
        <span className="max-w-[200px] truncate text-sm text-gray-500">
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: 'resolution_status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue() as string;
        return (
          <Badge variant="secondary" className={statusColors[status] ?? ''}>
            {status.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const term = row.original;
        if (term.resolution_status !== 'pending') return null;

        return (
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Link2 className="mr-1 h-3.5 w-3.5" />
                  Assign
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Assign to Data Asset</p>
                  <Select
                    value={selectedAssetId[term.id] ?? ''}
                    onValueChange={(v) =>
                      setSelectedAssetId((prev) => ({ ...prev, [term.id]: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(assets ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => handleAssign(term.id)}
                    disabled={!selectedAssetId[term.id] || resolveMutation.isPending}
                  >
                    Confirm
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDismiss(term.id)}
              disabled={resolveMutation.isPending}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Unmatched Terms"
        description="Terms the AI could not map to data assets. Assign to an asset to add as synonym, or dismiss."
      >
        {pendingTerms.length > 0 && (
          <Button
            variant="outline"
            onClick={handleBulkDismiss}
            disabled={bulkDismissMutation.isPending}
          >
            Dismiss All Pending ({pendingTerms.length})
          </Button>
        )}
      </AdminPageHeader>

      <AdminDataTable
        columns={columns}
        data={terms ?? []}
        isLoading={isLoading}
        searchPlaceholder="Search terms..."
        searchColumn="unmatched_term"
      />
    </div>
  );
}
