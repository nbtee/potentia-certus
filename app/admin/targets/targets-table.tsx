'use client';

import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/admin-data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTargets, useDeleteTarget } from '@/lib/admin/hooks';
import { TargetDialog } from './target-dialog';
import type { ConsultantTarget } from '@/lib/admin/types';
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react';

const typeColors: Record<string, string> = {
  revenue: 'bg-emerald-100 text-emerald-800',
  placements: 'bg-teal-100 text-teal-800',
  submittals: 'bg-purple-100 text-purple-800',
  calls: 'bg-amber-100 text-amber-800',
  client_visits: 'bg-cyan-100 text-cyan-800',
  interviews: 'bg-pink-100 text-pink-800',
};

export function TargetsTable() {
  const { data: targets, isLoading } = useTargets();
  const deleteMutation = useDeleteTarget();
  const [dialogOpen, setDialogOpen] = useState(false);

  const columns: ColumnDef<ConsultantTarget, unknown>[] = [
    {
      id: 'consultant',
      header: 'Consultant',
      cell: ({ row }) => {
        const c = row.original.consultant;
        return (
          <span className="font-medium">
            {c ? `${c.first_name} ${c.last_name}` : '-'}
          </span>
        );
      },
    },
    {
      accessorKey: 'target_type',
      header: 'Type',
      cell: ({ getValue }) => {
        const type = getValue() as string;
        return (
          <Badge variant="secondary" className={typeColors[type] ?? 'bg-gray-100 text-gray-800'}>
            {type.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'target_value',
      header: 'Value',
      cell: ({ row }) => {
        const val = row.original.target_value;
        const type = row.original.target_type;
        return (
          <span className="font-mono text-sm">
            {type === 'revenue' ? `$${val.toLocaleString()}` : val.toLocaleString()}
          </span>
        );
      },
    },
    {
      accessorKey: 'period_type',
      header: 'Period',
      cell: ({ getValue }) => {
        const pt = getValue() as string;
        return (
          <Badge
            variant="secondary"
            className={
              pt === 'weekly'
                ? 'bg-cyan-100 text-cyan-800'
                : 'bg-gray-100 text-gray-800'
            }
          >
            {pt}
          </Badge>
        );
      },
    },
    {
      id: 'dates',
      header: 'Date Range',
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">
          {row.original.period_start} — {row.original.period_end}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => deleteMutation.mutate(row.original.id)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Consultant Targets"
        description="Individual targets rolled up through hierarchy. Budget/placement targets are monthly; activity/delivery targets are weekly."
      >
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Set Target
        </Button>
      </AdminPageHeader>

      <AdminDataTable
        columns={columns}
        data={targets ?? []}
        isLoading={isLoading}
        searchPlaceholder="Search targets..."
      />

      <TargetDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
