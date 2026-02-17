'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  useUsers,
  useHierarchy,
  useCreateTarget,
  useBulkSetTeamTargets,
} from '@/lib/admin/hooks';
import type { UserProfile, OrgNode } from '@/lib/admin/types';

interface TargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TARGET_TYPES = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'placements', label: 'Placements' },
  { value: 'submittals', label: 'Submittals' },
  { value: 'calls', label: 'Calls' },
  { value: 'client_visits', label: 'Client Visits' },
  { value: 'interviews', label: 'Interviews' },
];

export function TargetDialog({ open, onOpenChange }: TargetDialogProps) {
  const { data: users } = useUsers();
  const { data: hierarchy } = useHierarchy();
  const createMutation = useCreateTarget();
  const bulkMutation = useBulkSetTeamTargets();

  // Shared form state
  const [targetType, setTargetType] = useState('revenue');
  const [targetValue, setTargetValue] = useState('');
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('monthly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  // Individual mode
  const [consultantId, setConsultantId] = useState('');

  // Bulk mode
  const [teamNodeId, setTeamNodeId] = useState('');

  const consultants = (users ?? []).filter(
    (u: UserProfile) => u.is_active
  );

  const teams = (hierarchy ?? []).filter(
    (n: OrgNode) => n.hierarchy_level === 'team'
  );

  const isPending = createMutation.isPending || bulkMutation.isPending;

  async function handleIndividualSave() {
    await createMutation.mutateAsync({
      consultant_id: consultantId,
      target_type: targetType,
      target_value: parseFloat(targetValue),
      period_type: periodType,
      period_start: periodStart,
      period_end: periodEnd,
    });
    onOpenChange(false);
  }

  async function handleBulkSave() {
    await bulkMutation.mutateAsync({
      hierarchy_node_id: teamNodeId,
      target_type: targetType,
      target_value: parseFloat(targetValue),
      period_type: periodType,
      period_start: periodStart,
      period_end: periodEnd,
    });
    onOpenChange(false);
  }

  const sharedForm = (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Target Type</Label>
          <Select value={targetType} onValueChange={setTargetType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGET_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Period Type</Label>
          <Select value={periodType} onValueChange={(v) => setPeriodType(v as 'weekly' | 'monthly')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Target Value</Label>
        <Input
          type="number"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          placeholder={periodType === 'monthly' ? 'e.g. 50000' : 'e.g. 20'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Period Start</Label>
          <Input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>Period End</Label>
          <Input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Set Target</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="individual">
          <TabsList className="mb-4">
            <TabsTrigger value="individual">Individual</TabsTrigger>
            <TabsTrigger value="bulk">Bulk (Team)</TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="space-y-4">
            <div className="grid gap-2">
              <Label>Consultant</Label>
              <Select value={consultantId} onValueChange={setConsultantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select consultant..." />
                </SelectTrigger>
                <SelectContent>
                  {consultants.map((u: UserProfile) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {sharedForm}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleIndividualSave}
                disabled={isPending || !consultantId || !targetValue}
              >
                {isPending ? 'Saving...' : 'Set Target'}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <div className="grid gap-2">
              <Label>Team</Label>
              <Select value={teamNodeId} onValueChange={setTeamNodeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((n: OrgNode) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Applies the same target value to all active members of this team.
              </p>
            </div>

            {sharedForm}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkSave}
                disabled={isPending || !teamNodeId || !targetValue}
              >
                {isPending ? 'Saving...' : 'Set Team Targets'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
