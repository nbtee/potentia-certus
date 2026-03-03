'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
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
import {
  useUsers,
  useDeactivateUser,
  useReactivateUser,
  useSendInvite,
  useSendPasswordReset,
} from '@/lib/admin/hooks';
import { UserDialog } from './user-dialog';
import { CSVImportDialog } from './csv-import-dialog';
import type { UserProfile } from '@/lib/admin/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MoreHorizontal, Plus, UserX, UserCheck, Pencil, Upload, Mail, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  manager: 'bg-teal-100 text-teal-800',
  team_lead: 'bg-cyan-100 text-cyan-800',
  consultant: 'bg-gray-100 text-gray-800',
};

const titleLabels: Record<string, string> = {
  associate_consultant: 'Associate Consultant',
  consultant: 'Consultant',
  senior_consultant: 'Senior Consultant',
  principal_consultant: 'Principal Consultant',
  talent_manager: 'Talent Manager',
  senior_talent_manager: 'Senior Talent Manager',
  general_manager: 'General Manager',
  director: 'Director',
};

// ============================================================================
// Row Actions (extracted to avoid capturing unstable refs in columns)
// ============================================================================

function RowActions({
  user,
  onEdit,
  onDeactivate,
  onReactivate,
  onSendInvite,
  onResetPassword,
}: {
  user: UserProfile;
  onEdit: (u: UserProfile) => void;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
  onSendInvite: (id: string) => void;
  onResetPassword: (id: string) => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(user)}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Edit
        </DropdownMenuItem>
        {user.is_active && (
          <>
            <DropdownMenuItem onClick={() => onSendInvite(user.id)}>
              <Mail className="mr-2 h-3.5 w-3.5" />
              Send Invite
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onResetPassword(user.id)}>
              <KeyRound className="mr-2 h-3.5 w-3.5" />
              Reset Password
            </DropdownMenuItem>
          </>
        )}
        {user.is_active ? (
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => onDeactivate(user.id)}
          >
            <UserX className="mr-2 h-3.5 w-3.5" />
            Deactivate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onReactivate(user.id)}>
            <UserCheck className="mr-2 h-3.5 w-3.5" />
            Reactivate
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// UserTable
// ============================================================================

export function UserTable() {
  const { data: users, isLoading } = useUsers();
  const deactivateMutation = useDeactivateUser();
  const reactivateMutation = useReactivateUser();
  const sendInviteMutation = useSendInvite();
  const sendPasswordResetMutation = useSendPasswordReset();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [hideDeactivated, setHideDeactivated] = useState(true);

  const filteredUsers = useMemo(
    () => hideDeactivated ? (users ?? []).filter((u) => u.is_active) : (users ?? []),
    [users, hideDeactivated]
  );

  // Use refs so column cell renderers always access the latest callbacks
  // without needing to be recreated on every render
  const deactivateRef = useRef(deactivateMutation);
  deactivateRef.current = deactivateMutation;
  const reactivateRef = useRef(reactivateMutation);
  reactivateRef.current = reactivateMutation;
  const sendInviteRef = useRef(sendInviteMutation);
  sendInviteRef.current = sendInviteMutation;
  const sendPasswordResetRef = useRef(sendPasswordResetMutation);
  sendPasswordResetRef.current = sendPasswordResetMutation;

  const handleEdit = useCallback((u: UserProfile) => {
    setEditingUser(u);
    setDialogOpen(true);
  }, []);

  const handleDeactivate = useCallback((id: string) => {
    deactivateRef.current.mutate(id);
  }, []);

  const handleReactivate = useCallback((id: string) => {
    reactivateRef.current.mutate(id);
  }, []);

  const handleSendInvite = useCallback((id: string) => {
    sendInviteRef.current.mutate(id, {
      onSuccess: () => toast.success('Invite email sent'),
      onError: (err) => toast.error(`Failed to send invite: ${err.message}`),
    });
  }, []);

  const handleResetPassword = useCallback((id: string) => {
    sendPasswordResetRef.current.mutate(id, {
      onSuccess: () => toast.success('Password reset email sent'),
      onError: (err) => toast.error(`Failed to send reset: ${err.message}`),
    });
  }, []);

  // Memoize columns so TanStack Table doesn't infinite re-render
  const columns = useMemo<ColumnDef<UserProfile, unknown>[]>(
    () => [
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
        accessorKey: 'title',
        header: 'Title',
        cell: ({ getValue }) => {
          const t = getValue() as string | null;
          if (!t) return <span className="text-sm text-gray-400">-</span>;
          return <span className="text-sm">{titleLabels[t] ?? t}</span>;
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
        cell: ({ row }) => (
          <RowActions
            user={row.original}
            onEdit={handleEdit}
            onDeactivate={handleDeactivate}
            onReactivate={handleReactivate}
            onSendInvite={handleSendInvite}
            onResetPassword={handleResetPassword}
          />
        ),
      },
    ],
    [handleEdit, handleDeactivate, handleReactivate, handleSendInvite, handleResetPassword]
  );

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

      <div className="flex items-center gap-2 mb-4">
        <Switch
          id="hide-deactivated"
          checked={hideDeactivated}
          onCheckedChange={setHideDeactivated}
        />
        <Label htmlFor="hide-deactivated" className="text-sm text-muted-foreground cursor-pointer">
          Hide deactivated users
        </Label>
      </div>

      <AdminDataTable
        columns={columns}
        data={filteredUsers}
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
