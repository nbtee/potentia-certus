'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listDashboards,
  getDashboardWithWidgets,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  addWidget,
  removeWidget,
  saveLayout,
  createFromTemplate,
} from '@/app/dashboards/actions';
import type {
  CreateDashboardInput,
  LayoutItem,
  WidgetParameters,
  WidgetConfig,
} from '@/lib/dashboards/types';

// ============================================================================
// Query Keys
// ============================================================================

export const dashboardKeys = {
  all: ['dashboards'] as const,
  detail: (id: string) => ['dashboard', id] as const,
};

// ============================================================================
// Queries
// ============================================================================

export function useDashboards() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: async () => {
      const result = await listDashboards();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useDashboard(id: string) {
  return useQuery({
    queryKey: dashboardKeys.detail(id),
    queryFn: async () => {
      const result = await getDashboardWithWidgets(id);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!id,
  });
}

// ============================================================================
// Mutations
// ============================================================================

export function useCreateDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDashboardInput) => {
      const result = await createDashboard(input);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useUpdateDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string | null; is_shared?: boolean }) => {
      const result = await updateDashboard(input);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      if (data) {
        queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(data.id) });
      }
    },
  });
}

export function useDeleteDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dashboardId: string) => {
      const result = await deleteDashboard(dashboardId);
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useAddWidget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      dashboardId: string;
      dataAssetId: string;
      widgetType: string;
      parameters?: WidgetParameters;
      widgetConfig?: WidgetConfig;
      position?: { x: number; y: number; w: number; h: number };
    }) => {
      const result = await addWidget(input);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.detail(variables.dashboardId),
      });
    },
  });
}

export function useRemoveWidget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ widgetId, dashboardId }: { widgetId: string; dashboardId: string }) => {
      const result = await removeWidget(widgetId, dashboardId);
      if (result.error) throw new Error(result.error);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.detail(variables.dashboardId),
      });
    },
  });
}

export function useSaveLayout() {
  return useMutation({
    mutationFn: async (input: { dashboardId: string; layout: LayoutItem[] }) => {
      const result = await saveLayout(input);
      if (result.error) throw new Error(result.error);
    },
  });
}

export function useCreateFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, name }: { templateId: string; name: string }) => {
      const result = await createFromTemplate(templateId, name);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
