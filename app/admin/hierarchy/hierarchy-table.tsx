'use client';

import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/admin-data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useHierarchy,
  useCreateNode,
  useUpdateNode,
  useDeleteNode,
} from '@/lib/admin/hooks';
import { flattenHierarchy, getValidParents, formatHierarchyLevel } from '@/lib/admin/utils';
import type { OrgNode } from '@/lib/admin/types';
import { MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react';

const levelColors: Record<string, string> = {
  national: 'bg-purple-100 text-purple-800',
  region: 'bg-blue-100 text-blue-800',
  team: 'bg-emerald-100 text-emerald-800',
  individual: 'bg-gray-100 text-gray-800',
};

export function HierarchyTable() {
  const { data: nodes, isLoading } = useHierarchy();
  const createMutation = useCreateNode();
  const updateMutation = useUpdateNode();
  const deleteMutation = useDeleteNode();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<OrgNode | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [level, setLevel] = useState<string>('team');
  const [parentId, setParentId] = useState<string>('none');
  const [isSalesTeam, setIsSalesTeam] = useState(true);

  const flatNodes = nodes ? flattenHierarchy(nodes) : [];

  function openCreate() {
    setEditingNode(null);
    setName('');
    setLevel('team');
    setParentId('none');
    setIsSalesTeam(true);
    setDialogOpen(true);
  }

  function openEdit(node: OrgNode) {
    setEditingNode(node);
    setName(node.name);
    setLevel(node.hierarchy_level);
    setParentId(node.parent_id ?? 'none');
    setIsSalesTeam(node.is_sales_team);
    setDialogOpen(true);
  }

  async function handleSave() {
    const pid = parentId === 'none' ? null : parentId;

    if (editingNode) {
      await updateMutation.mutateAsync({
        id: editingNode.id,
        name,
        parent_id: pid,
        is_sales_team: isSalesTeam,
      });
    } else {
      await createMutation.mutateAsync({
        name,
        hierarchy_level: level as OrgNode['hierarchy_level'],
        parent_id: pid,
        is_sales_team: isSalesTeam,
      });
    }
    setDialogOpen(false);
  }

  const validParents = nodes ? getValidParents(nodes, editingNode?.id) : [];

  const columns: ColumnDef<OrgNode & { depth: number }, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span style={{ paddingLeft: `${row.original.depth * 24}px` }} className="font-medium">
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'hierarchy_level',
      header: 'Level',
      cell: ({ getValue }) => {
        const lev = getValue() as string;
        return (
          <Badge variant="secondary" className={levelColors[lev] ?? ''}>
            {formatHierarchyLevel(lev)}
          </Badge>
        );
      },
    },
    {
      id: 'parent',
      header: 'Parent',
      cell: ({ row }) => {
        const parent = nodes?.find((n) => n.id === row.original.parent_id);
        return <span className="text-sm text-gray-500">{parent?.name ?? '-'}</span>;
      },
    },
    {
      accessorKey: 'member_count',
      header: 'Members',
      cell: ({ getValue }) => (
        <span className="text-sm">{(getValue() as number) || '-'}</span>
      ),
    },
    {
      accessorKey: 'is_sales_team',
      header: 'Sales Team',
      cell: ({ getValue }) => (
        <Badge variant="secondary" className={getValue() ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
          {getValue() ? 'Yes' : 'No'}
        </Badge>
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
            <DropdownMenuItem onClick={() => openEdit(row.original)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
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

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <AdminPageHeader
        title="Org Hierarchy"
        description="Manage organizational structure: National > Region > Team > Individual."
      >
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Node
        </Button>
      </AdminPageHeader>

      <AdminDataTable
        columns={columns}
        data={flatNodes}
        isLoading={isLoading}
        searchPlaceholder="Search hierarchy..."
        searchColumn="name"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingNode ? 'Edit Node' : 'Create Node'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="node-name">Name</Label>
              <Input
                id="node-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {!editingNode && (
              <div className="grid gap-2">
                <Label>Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national">National</SelectItem>
                    <SelectItem value="region">Region</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Parent</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (root)</SelectItem>
                  {validParents.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.name} ({formatHierarchyLevel(n.hierarchy_level)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={isSalesTeam}
                onCheckedChange={setIsSalesTeam}
              />
              <Label>Sales Team</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending || !name.trim()}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
