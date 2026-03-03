'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useInviteUser, useUpdateUser, useHierarchy } from '@/lib/admin/hooks';
import type { UserProfile, OrgNode } from '@/lib/admin/types';
import { toast } from 'sonner';

const TITLE_OPTIONS = [
  { value: 'associate_consultant', label: 'Associate Consultant' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'senior_consultant', label: 'Senior Consultant' },
  { value: 'principal_consultant', label: 'Principal Consultant' },
  { value: 'delivery_lead', label: 'Delivery Lead' },
  { value: 'talent_manager', label: 'Talent Manager' },
  { value: 'senior_talent_manager', label: 'Senior Talent Manager' },
  { value: 'general_manager', label: 'General Manager' },
  { value: 'director', label: 'Director' },
] as const;

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserProfile | null; // null = create mode
}

export function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
  const isEdit = !!user;
  const inviteMutation = useInviteUser();
  const updateMutation = useUpdateUser();
  const { data: hierarchy } = useHierarchy();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<string>('consultant');
  const [title, setTitle] = useState<string>('none');
  const [hierarchyNodeId, setHierarchyNodeId] = useState<string>('none');

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setFirstName(user.first_name ?? '');
      setLastName(user.last_name ?? '');
      setRole(user.role);
      setTitle(user.title ?? 'none');
      setHierarchyNodeId(user.hierarchy_node_id ?? 'none');
    } else {
      setEmail('');
      setFirstName('');
      setLastName('');
      setRole('consultant');
      setTitle('none');
      setHierarchyNodeId('none');
    }
  }, [user, open]);

  const teams = (hierarchy ?? []).filter(
    (n: OrgNode) => n.hierarchy_level === 'team' || n.hierarchy_level === 'individual'
  );

  const isPending = inviteMutation.isPending || updateMutation.isPending;

  async function handleSubmit() {
    const titleValue = title === 'none' ? null : (title as typeof TITLE_OPTIONS[number]['value']);

    try {
      if (isEdit && user) {
        await updateMutation.mutateAsync({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          role: role as UserProfile['role'],
          title: titleValue,
        });
        toast.success('User updated successfully');
      } else {
        const nodeId = hierarchyNodeId === 'none' ? null : hierarchyNodeId;
        await inviteMutation.mutateAsync({
          email,
          first_name: firstName,
          last_name: lastName,
          role: role as UserProfile['role'],
          title: titleValue,
          hierarchy_node_id: nodeId,
        });
        toast.success(`Invite sent to ${email}`);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Invite User'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {!isEdit && (
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultant">Consultant</SelectItem>
                  <SelectItem value="team_lead">Team Lead</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Select value={title} onValueChange={setTitle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No title</SelectItem>
                  {TITLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isEdit ? (
            <div className="grid gap-2">
              <Label>Team</Label>
              <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                {user?.hierarchy_node?.name ?? 'No team assigned'}
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="team">Team</Label>
              <Select value={hierarchyNodeId} onValueChange={setHierarchyNodeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team assigned</SelectItem>
                  {teams.map((node: OrgNode) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Invite User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
