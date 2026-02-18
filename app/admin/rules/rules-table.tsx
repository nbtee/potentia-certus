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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useBusinessRules,
  useCreateBusinessRule,
  useUpdateBusinessRule,
  useDeleteBusinessRule,
} from '@/lib/admin/hooks';
import type { BusinessRule } from '@/lib/admin/types';
import { MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react';

const typeColors: Record<string, string> = {
  revenue_blending: 'bg-emerald-100 text-emerald-800',
  threshold: 'bg-amber-100 text-amber-800',
  scoring: 'bg-teal-100 text-teal-800',
};

export function RulesTable() {
  const { data: rules, isLoading } = useBusinessRules();
  const createMutation = useCreateBusinessRule();
  const updateMutation = useUpdateBusinessRule();
  const deleteMutation = useDeleteBusinessRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BusinessRule | null>(null);

  // Form state
  const [ruleType, setRuleType] = useState('');
  const [ruleKey, setRuleKey] = useState('');
  const [ruleValueStr, setRuleValueStr] = useState('{}');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveUntil, setEffectiveUntil] = useState('');
  const [description, setDescription] = useState('');

  function openCreate() {
    setEditingRule(null);
    setRuleType('');
    setRuleKey('');
    setRuleValueStr('{}');
    setEffectiveFrom(new Date().toISOString().slice(0, 10));
    setEffectiveUntil('');
    setDescription('');
    setDialogOpen(true);
  }

  function openEdit(rule: BusinessRule) {
    setEditingRule(rule);
    setRuleType(rule.rule_type);
    setRuleKey(rule.rule_key);
    setRuleValueStr(JSON.stringify(rule.rule_value, null, 2));
    setEffectiveFrom(rule.effective_from);
    setEffectiveUntil(rule.effective_until ?? '');
    setDescription(rule.description ?? '');
    setDialogOpen(true);
  }

  async function handleSave() {
    let ruleValue: Record<string, unknown>;
    try {
      ruleValue = JSON.parse(ruleValueStr);
    } catch {
      return; // Invalid JSON
    }

    if (editingRule) {
      await updateMutation.mutateAsync({
        id: editingRule.id,
        rule_value: ruleValue,
        effective_until: effectiveUntil || null,
        description: description || null,
      });
    } else {
      await createMutation.mutateAsync({
        rule_type: ruleType,
        rule_key: ruleKey,
        rule_value: ruleValue,
        effective_from: effectiveFrom,
        effective_until: effectiveUntil || null,
        description: description || null,
      });
    }
    setDialogOpen(false);
  }

  const columns: ColumnDef<BusinessRule, unknown>[] = [
    {
      accessorKey: 'rule_type',
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
      accessorKey: 'rule_key',
      header: 'Key',
      cell: ({ getValue }) => (
        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
          {getValue() as string}
        </code>
      ),
    },
    {
      accessorKey: 'rule_value',
      header: 'Value',
      cell: ({ getValue }) => (
        <code className="text-xs text-gray-600">
          {JSON.stringify(getValue())}
        </code>
      ),
    },
    {
      accessorKey: 'effective_from',
      header: 'From',
      cell: ({ getValue }) => (
        <span className="text-sm">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'effective_until',
      header: 'Until',
      cell: ({ getValue }) => (
        <span className="text-sm text-gray-500">
          {(getValue() as string) ?? 'Ongoing'}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ getValue }) => (
        <span className="max-w-[200px] truncate text-sm text-gray-500">
          {(getValue() as string) ?? '-'}
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
        title="Business Rules"
        description="Revenue blending multipliers, thresholds, and scoring parameters."
      >
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
      </AdminPageHeader>

      <AdminDataTable
        columns={columns}
        data={rules ?? []}
        isLoading={isLoading}
        searchPlaceholder="Search rules..."
        searchColumn="rule_type"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Edit Rule' : 'Create Rule'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {!editingRule && (
              <>
                <div className="grid gap-2">
                  <Label>Rule Type</Label>
                  <Input
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value)}
                    placeholder="e.g. revenue_blending"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Rule Key</Label>
                  <Input
                    value={ruleKey}
                    onChange={(e) => setRuleKey(e.target.value)}
                    placeholder="e.g. contract_to_perm_multiplier"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Effective From</Label>
                  <Input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label>Rule Value (JSON)</Label>
              <textarea
                className="min-h-[80px] rounded-md border border-gray-200 px-3 py-2 text-sm font-mono"
                value={ruleValueStr}
                onChange={(e) => setRuleValueStr(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Effective Until</Label>
              <Input
                type="date"
                value={effectiveUntil}
                onChange={(e) => setEffectiveUntil(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
