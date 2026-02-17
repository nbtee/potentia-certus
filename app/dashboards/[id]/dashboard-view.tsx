'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { DashboardWithWidgets, LayoutItem } from '@/lib/dashboards/types';
import {
  useDashboard,
  useUpdateDashboard,
  useRemoveWidget,
  useSaveLayout,
} from '@/lib/dashboards/hooks';
import { FilterProvider, useDateRange } from '@/lib/contexts/filter-context';
import { EnhancedFilterBar } from '@/components/enhanced-filter-bar';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { AddWidgetDialog } from '@/components/dashboard/add-widget-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Pencil,
  Eye,
  Plus,
  Share2,
  Check,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { ChatTrigger } from '@/components/ai-chat/chat-trigger';

interface DashboardViewProps {
  initialDashboard: DashboardWithWidgets;
  isOwner: boolean;
  userRole: 'consultant' | 'team_lead' | 'manager' | 'admin';
}

export function DashboardView({
  initialDashboard,
  isOwner,
  userRole,
}: DashboardViewProps) {
  return (
    <FilterProvider>
      <DashboardViewInner
        initialDashboard={initialDashboard}
        isOwner={isOwner}
        userRole={userRole}
      />
    </FilterProvider>
  );
}

function DashboardViewInner({
  initialDashboard,
  isOwner,
  userRole,
}: DashboardViewProps) {
  const router = useRouter();
  const dateRange = useDateRange();
  const { data: liveDashboard } = useDashboard(initialDashboard.id);
  const updateDashboard = useUpdateDashboard();
  const removeWidgetMutation = useRemoveWidget();
  const saveLayoutMutation = useSaveLayout();

  // Use live data if available, fall back to initial server data
  const dashboard = liveDashboard ?? initialDashboard;

  const [isEditing, setIsEditing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(dashboard.name);
  const [showAddWidget, setShowAddWidget] = useState(false);

  const handleSaveTitle = async () => {
    if (editTitle.trim() && editTitle !== dashboard.name) {
      await updateDashboard.mutateAsync({
        id: dashboard.id,
        name: editTitle.trim(),
      });
    }
    setIsEditingTitle(false);
  };

  const handleToggleShare = async () => {
    await updateDashboard.mutateAsync({
      id: dashboard.id,
      is_shared: !dashboard.is_shared,
    });
  };

  const handleLayoutChange = useCallback(
    (layout: LayoutItem[]) => {
      saveLayoutMutation.mutate({
        dashboardId: dashboard.id,
        layout,
      });
    },
    [dashboard.id, saveLayoutMutation]
  );

  const handleRemoveWidget = useCallback(
    (widgetId: string) => {
      removeWidgetMutation.mutate({
        widgetId,
        dashboardId: dashboard.id,
      });
    },
    [dashboard.id, removeWidgetMutation]
  );

  const handleWidgetAdded = () => {
    setShowAddWidget(false);
    // Query will auto-invalidate via the hook
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboards">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="flex-1 min-w-0">
          {isEditingTitle && isOwner ? (
            <div className="flex items-center gap-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-bold"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setEditTitle(dashboard.name);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleSaveTitle}>
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditTitle(dashboard.name);
                  setIsEditingTitle(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <h1
              className={`truncate text-2xl font-bold text-gray-900 ${isOwner ? 'cursor-pointer hover:text-gray-600' : ''}`}
              onClick={() => isOwner && setIsEditingTitle(true)}
              title={isOwner ? 'Click to edit title' : undefined}
            >
              {dashboard.name}
            </h1>
          )}
          {dashboard.description && (
            <p className="mt-0.5 text-sm text-gray-500 truncate">
              {dashboard.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              <Button
                variant={isEditing ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <>
                    <Eye className="mr-1.5 h-4 w-4" />
                    View Mode
                  </>
                ) : (
                  <>
                    <Pencil className="mr-1.5 h-4 w-4" />
                    Edit
                  </>
                )}
              </Button>

              {isEditing && (
                <Button size="sm" onClick={() => setShowAddWidget(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Widget
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleShare}
                disabled={updateDashboard.isPending}
                title={dashboard.is_shared ? 'Stop sharing' : 'Share dashboard'}
              >
                <Share2
                  className={`h-4 w-4 ${dashboard.is_shared ? 'text-sky-500' : ''}`}
                />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <EnhancedFilterBar userRole={userRole} />

      {/* Grid */}
      <DashboardGrid
        widgets={dashboard.dashboard_widgets}
        layout={dashboard.layout || []}
        dateRange={dateRange}
        isEditable={isEditing && isOwner}
        onLayoutChange={handleLayoutChange}
        onRemoveWidget={handleRemoveWidget}
      />

      {/* Add Widget Dialog */}
      {showAddWidget && (
        <AddWidgetDialog
          dashboardId={dashboard.id}
          open={showAddWidget}
          onOpenChange={setShowAddWidget}
          onWidgetAdded={handleWidgetAdded}
        />
      )}

      {/* AI Chat */}
      <ChatTrigger dashboardId={dashboard.id} />
    </div>
  );
}
