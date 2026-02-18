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
import { useUsers, useDeactivateUser, useReactivateUser } from '@/lib/admin/hooks';
import { UserDialog } from './user-dialog';
import { CSVImportDialog } from './csv-import-dialog';
import type { UserProfile } from '@/lib/admin/types';
import { MoreHorizontal, Plus, UserX, UserCheck, Pencil, Upload } from 'lucide-react';

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  manager: 'bg-teal-100 text-teal-800',
  team_lead: 'bg-cyan-100 text-cyan-800',
  consultant: 'bg-gray-100 text-gray-800',
};

export function UserTable() {
  const { data: users, isLoading } = useUsers();
  const deactivateMutation = useDeactivateUser();
  const reactivateMutation = useReactivateUser();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const columns: ColumnDef<UserProfile, unknown>[] = [
    {
      accessorFn: (row) =>
        `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || row.email,
      id: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const u = row.original;
        const name =
          `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email;
        return (
          <div>
            <div className="font-medium">{name}</div>
            <div className="text-xs text-gray-500">{u.email}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ getValue }) => {
        const role = getValue() as string;
        return (
          <Badge variant="secondary" className={roleColors[role] ?? ''}>
            {role.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'team',
      header: 'Team',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {row.original.hierarchy_node?.name ?? '-'}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ getValue }) => {
        const active = getValue() as boolean;
        return (
          <Badge
            variant="secondary"
            className={
              active
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }
          >
            {active ? 'Active' : 'Deactivated'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingUser(u);
                  setDialogOpen(true);
                }}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit
              </DropdownMenuItem>
              {u.is_active ? (
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => deactivateMutation.mutate(u.id)}
                >
                  <UserX className="mr-2 h-3.5 w-3.5" />
                  Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => reactivateMutation.mutate(u.id)}
                >
                  <UserCheck className="mr-2 h-3.5 w-3.5" />
                  Reactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div>
      <AdminPageHeader title="Users" description="Manage user accounts and roles.">
        <Button variant="outline" onClick={() => setCsvDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
        <Button
          onClick={() => {
            setEditingUser(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </AdminPageHeader>

      <AdminDataTable
        columns={columns}
        data={users ?? []}
        isLoading={isLoading}
        searchPlaceholder="Search users..."
        searchColumn="name"
      />

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editingUser}
      />

      <CSVImportDialog
        open={csvDialogOpen}
        onOpenChange={setCsvDialogOpen}
      />
    </div>
  );
}
