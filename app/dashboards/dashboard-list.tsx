'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useDashboards,
  useCreateDashboard,
  useDeleteDashboard,
  useCreateFromTemplate,
} from '@/lib/dashboards/hooks';
import type { Dashboard } from '@/lib/dashboards/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Trash2,
  LayoutGrid,
  Share2,
  Clock,
  Copy,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export function DashboardList() {
  const { data: dashboards, isLoading, error } = useDashboards();
  const createDashboard = useCreateDashboard();
  const deleteDashboard = useDeleteDashboard();
  const createFromTemplate = useCreateFromTemplate();
  const router = useRouter();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Split dashboards into own, shared, and templates
  const ownDashboards = dashboards?.filter(
    (d) => !d.is_template && !d.is_shared
  ) ?? [];
  const sharedDashboards = dashboards?.filter(
    (d) => d.is_shared && !d.is_template
  ) ?? [];
  const templates = dashboards?.filter((d) => d.is_template) ?? [];

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const result = await createDashboard.mutateAsync({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
    });
    setShowCreateDialog(false);
    setNewName('');
    setNewDescription('');
    if (result) {
      router.push(`/dashboards/${result.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDashboard.mutateAsync(id);
    setDeleteConfirm(null);
  };

  const handleCreateFromTemplate = async (template: Dashboard) => {
    const result = await createFromTemplate.mutateAsync({
      templateId: template.id,
      name: `${template.name} (Copy)`,
    });
    if (result) {
      router.push(`/dashboards/${result.id}`);
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-600">Failed to load dashboards: {error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-2 h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Dashboard
        </Button>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Templates</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-dashed border-teal-300 bg-teal-50/50 transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <LayoutGrid className="h-4 w-4 text-teal-500" />
                      {template.name}
                    </CardTitle>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateFromTemplate(template)}
                      disabled={createFromTemplate.isPending}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Own Dashboards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Your Dashboards</h2>
        {ownDashboards.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-8 text-center">
            <LayoutGrid className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-3 text-sm font-medium text-gray-500">
              No dashboards yet
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Create one or use a template to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ownDashboards.map((dashboard, i) => (
              <DashboardCard
                key={dashboard.id}
                dashboard={dashboard}
                index={i}
                onDelete={() => setDeleteConfirm(dashboard.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Shared Dashboards */}
      {sharedDashboards.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Shared with You</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sharedDashboards.map((dashboard, i) => (
              <DashboardCard
                key={dashboard.id}
                dashboard={dashboard}
                index={i}
                isShared
              />
            ))}
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Dashboard"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What is this dashboard for?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createDashboard.isPending}
            >
              {createDashboard.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Dashboard</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This will permanently delete this dashboard and all its widgets. This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={deleteDashboard.isPending}
            >
              {deleteDashboard.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Dashboard Card
// ============================================================================

function DashboardCard({
  dashboard,
  index,
  onDelete,
  isShared,
}: {
  dashboard: Dashboard;
  index: number;
  onDelete?: () => void;
  isShared?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/dashboards/${dashboard.id}`}>
        <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutGrid className="h-4 w-4 text-gray-400" />
              <span className="truncate">{dashboard.name}</span>
              {isShared && (
                <Share2 className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-teal-500" />
              )}
            </CardTitle>
            {dashboard.description && (
              <CardDescription className="line-clamp-2">
                {dashboard.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              {format(new Date(dashboard.updated_at), 'MMM d, yyyy')}
            </span>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                title="Delete dashboard"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
