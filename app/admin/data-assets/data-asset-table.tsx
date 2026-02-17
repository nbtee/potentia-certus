'use client';

import { useState, useEffect } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/admin-data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useAdminDataAssets,
  useCreateDataAsset,
  useUpdateDataAsset,
} from '@/lib/admin/hooks';
import type { DataAsset } from '@/lib/admin/types';
import { MoreHorizontal, Plus, Pencil } from 'lucide-react';

const categoryColors: Record<string, string> = {
  activity: 'bg-blue-100 text-blue-800',
  revenue: 'bg-emerald-100 text-emerald-800',
  pipeline: 'bg-purple-100 text-purple-800',
  performance: 'bg-amber-100 text-amber-800',
};

export function DataAssetTable() {
  const { data: assets, isLoading } = useAdminDataAssets();
  const createMutation = useCreateDataAsset();
  const updateMutation = useUpdateDataAsset();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<DataAsset | null>(null);

  // Form state
  const [assetKey, setAssetKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [synonymsStr, setSynonymsStr] = useState('');
  const [category, setCategory] = useState<string>('activity');
  const [outputShapesStr, setOutputShapesStr] = useState('');

  function openCreate() {
    setEditingAsset(null);
    setAssetKey('');
    setDisplayName('');
    setDescription('');
    setSynonymsStr('');
    setCategory('activity');
    setOutputShapesStr('single_value');
    setDialogOpen(true);
  }

  function openEdit(asset: DataAsset) {
    setEditingAsset(asset);
    setAssetKey(asset.asset_key);
    setDisplayName(asset.display_name);
    setDescription(asset.description ?? '');
    setSynonymsStr(asset.synonyms.join(', '));
    setCategory(asset.category);
    setOutputShapesStr(asset.output_shapes.join(', '));
    setDialogOpen(true);
  }

  async function handleSave() {
    const synonyms = synonymsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const outputShapes = outputShapesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingAsset) {
      await updateMutation.mutateAsync({
        id: editingAsset.id,
        display_name: displayName,
        description: description || null,
        synonyms,
        output_shapes: outputShapes,
      });
    } else {
      await createMutation.mutateAsync({
        asset_key: assetKey,
        display_name: displayName,
        description: description || null,
        synonyms,
        category: category as DataAsset['category'],
        output_shapes: outputShapes,
      });
    }
    setDialogOpen(false);
  }

  const columns: ColumnDef<DataAsset, unknown>[] = [
    {
      accessorKey: 'asset_key',
      header: 'Asset Key',
      cell: ({ getValue }) => (
        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">
          {getValue() as string}
        </code>
      ),
    },
    {
      accessorKey: 'display_name',
      header: 'Display Name',
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ getValue }) => {
        const cat = getValue() as string;
        return (
          <Badge variant="secondary" className={categoryColors[cat] ?? ''}>
            {cat}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'output_shapes',
      header: 'Shapes',
      cell: ({ getValue }) => {
        const shapes = getValue() as string[];
        return (
          <div className="flex flex-wrap gap-1">
            {shapes.map((s) => (
              <Badge key={s} variant="outline" className="text-xs">
                {s}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'synonyms',
      header: 'Synonyms',
      cell: ({ getValue }) => {
        const syns = getValue() as string[];
        if (syns.length === 0) return <span className="text-gray-400">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {syns.slice(0, 3).map((s) => (
              <Badge key={s} variant="secondary" className="text-xs bg-gray-100">
                {s}
              </Badge>
            ))}
            {syns.length > 3 && (
              <span className="text-xs text-gray-400">+{syns.length - 3}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'widget_count',
      header: 'Widgets',
      cell: ({ getValue }) => (
        <span className="text-sm">{(getValue() as number) || '-'}</span>
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
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <AdminPageHeader
        title="Data Assets"
        description="Manage data asset definitions, synonyms, and output shapes."
      >
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      </AdminPageHeader>

      <AdminDataTable
        columns={columns}
        data={assets ?? []}
        isLoading={isLoading}
        searchPlaceholder="Search assets..."
        searchColumn="asset_key"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? 'Edit Data Asset' : 'Create Data Asset'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {!editingAsset && (
              <div className="grid gap-2">
                <Label>Asset Key</Label>
                <Input
                  value={assetKey}
                  onChange={(e) => setAssetKey(e.target.value)}
                  placeholder="e.g. total_revenue"
                  className="font-mono"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label>Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {!editingAsset && (
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activity">Activity</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="pipeline">Pipeline</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Output Shapes (comma-separated)</Label>
              <Input
                value={outputShapesStr}
                onChange={(e) => setOutputShapesStr(e.target.value)}
                placeholder="single_value, time_series, categorical"
                className="font-mono text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label>Synonyms (comma-separated)</Label>
              <Input
                value={synonymsStr}
                onChange={(e) => setSynonymsStr(e.target.value)}
                placeholder="total revenue, earnings, income"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
