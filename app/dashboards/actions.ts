'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type {
  Dashboard,
  DashboardWithWidgets,
  LayoutItem,
  WidgetParameters,
  WidgetConfig,
} from '@/lib/dashboards/types';

// ============================================================================
// Zod Schemas
// ============================================================================

const createDashboardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
});

const updateDashboardSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  is_shared: z.boolean().optional(),
});

const addWidgetSchema = z.object({
  dashboardId: z.string().uuid(),
  dataAssetId: z.string().uuid(),
  widgetType: z.string().min(1),
  parameters: z.record(z.unknown()).optional(),
  widgetConfig: z.record(z.unknown()).optional(),
  position: z
    .object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })
    .optional(),
});

const layoutItemSchema = z.object({
  i: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minW: z.number().optional(),
  minH: z.number().optional(),
});

const saveLayoutSchema = z.object({
  dashboardId: z.string().uuid(),
  layout: z.array(layoutItemSchema),
});

// ============================================================================
// Helpers
// ============================================================================

type ActionResult<T = void> =
  | { data: T; error?: never }
  | { data?: never; error: string };

async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ============================================================================
// List Dashboards
// ============================================================================

export async function listDashboards(): Promise<ActionResult<Dashboard[]>> {
  const userId = await getAuthUserId();
  if (!userId) return { error: 'Not authenticated' };

  const supabase = await createClient();

  // Own dashboards + shared dashboards + templates
  const { data, error } = await supabase
    .from('dashboards')
    .select('*')
    .or(`owner_id.eq.${userId},is_shared.eq.true,is_template.eq.true`)
    .order('updated_at', { ascending: false });

  if (error) return { error: error.message };

  return { data: data as Dashboard[] };
}

// ============================================================================
// Get Dashboard with Widgets
// ============================================================================

export async function getDashboardWithWidgets(
  dashboardId: string
): Promise<ActionResult<DashboardWithWidgets>> {
  const userId = await getAuthUserId();
  if (!userId) return { error: 'Not authenticated' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dashboards')
    .select(
      `
      *,
      dashboard_widgets (
        *,
        data_assets:data_asset_id (
          asset_key,
          display_name,
          output_shapes,
          category
        )
      )
    `
    )
    .eq('id', dashboardId)
    .single();

  if (error) return { error: error.message };

  // Flatten the joined data_assets into each widget
  const dashboard = data as DashboardWithWidgets;
  dashboard.dashboard_widgets = dashboard.dashboard_widgets.map((w) => ({
    ...w,
    data_asset: (w as unknown as Record<string, unknown>).data_assets as DashboardWithWidgets['dashboard_widgets'][0]['data_asset'],
  }));

  return { data: dashboard };
}

// ============================================================================
// Create Dashboard
// ============================================================================

export async function createDashboard(
  input: z.infer<typeof createDashboardSchema>
): Promise<ActionResult<Dashboard>> {
  const userId = await getAuthUserId();
  if (!userId) return { error: 'Not authenticated' };

  const parsed = createDashboardSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dashboards')
    .insert({
      owner_id: userId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      layout: [],
      is_template: false,
      is_shared: false,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/dashboards');
  return { data: data as Dashboard };
}

// ============================================================================
// Update Dashboard
// ============================================================================

export async function updateDashboard(
  input: z.infer<typeof updateDashboardSchema>
): Promise<ActionResult<Dashboard>> {
  const userId = await getAuthUserId();
  if (!userId) return { error: 'Not authenticated' };

  const parsed = updateDashboardSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { id, ...updates } = parsed.data;
  const supabase = await createClient();

  // Only update fields that are provided
  const updateFields: Record<string, unknown> = {};
  if (updates.name !== undefined) updateFields.name = updates.name;
  if (updates.description !== undefined) updateFields.description = updates.description;
  if (updates.is_shared !== undefined) updateFields.is_shared = updates.is_shared;

  const { data, error } = await supabase
    .from('dashboards')
    .update(updateFields)
    .eq('id', id)
    .eq('owner_id', userId)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/dashboards');
  revalidatePath(`/dashboards/${id}`);
  return { data: data as Dashboard };
}

// ============================================================================
// Delete Dashboard
// ============================================================================

export async function deleteDashboard(
  dashboardId: string
): Promise<ActionResult> {
  const userId = await getAuthUserId();
  if (!userId) return { error: 'Not authenticated' };

  const supabase = await createClient();

  const { error } = await supabase
    .from('dashboards')
    .delete()
    .eq('id', dashboardId)
    .eq('owner_id', userId);

  if (error) return { error: error.message };

  revalidatePath('/dashboards');
  return { data: undefined };
}

// ============================================================================
// Add Widget
// ============================================================================

export async function addWidget(
  input: {
    dashboardId: string;
    dataAssetId: string;
    widgetType: string;
    parameters?: WidgetParameters;
    widgetConfig?: WidgetConfig;
    position?: { x: number; y: number; w: number; h: number };
  }
): Promise<ActionResult<{ widgetId: string }>> {
  const userId = await getAuthUserId();
  if (!userId) return { error: 'Not authenticated' };

  const parsed = addWidgetSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  // Verify dashboard ownership
  const { data: dashboard, error: dashError } = await supabase
    .from('dashboards')
    .select('id, layout')
    .eq('id', parsed.data.dashboardId)
    .eq('owner_id', userId)
    .single();

  if (dashError || !dashboard) return { error: 'Dashboard not found or access denied' };

  const pos = parsed.data.position || { x: 0, y: Infinity, w: 4, h: 3 };

  // Insert widget
  const { data: widget, error: widgetError } = await supabase
    .from('dashboard_widgets')
    .insert({
      dashboard_id: parsed.data.dashboardId,
      data_asset_id: parsed.data.dataAssetId,
      widget_type: parsed.data.widgetType,
      parameters: parsed.data.parameters || {},
      widget_config: parsed.data.widgetConfig || {},
      position: pos,
    })
    .select('id')
    .single();

  if (widgetError) return { error: widgetError.message };

  // Add to layout
  const currentLayout = (dashboard.layout as LayoutItem[]) || [];
  const newLayout = [
    ...currentLayout,
    { i: widget.id, x: pos.x, y: pos.y, w: pos.w, h: pos.h },
  ];

  await supabase
    .from('dashboards')
    .update({ layout: newLayout })
    .eq('id', parsed.data.dashboardId);

  revalidatePath(`/dashboards/${parsed.data.dashboardId}`);
  return { data: { widgetId: widget.id } };
}

// ============================================================================
// Remove Widget
// ============================================================================

export async function removeWidget(
  widgetId: string,
  dashboardId: string
): Promise<ActionResult> {
  const userId = await getAuthUserId();
  if (!userId) return { error: 'Not authenticated' };

  const supabase = await createClient();

  // Verify dashboard ownership
  const { data: dashboard, error: dashError } = await supabase
    .from('dashboards')
    .select('id, layout')
    .eq('id', dashboardId)
    .eq('owner_id', userId)
    .single();

  if (dashError || !dashboard) return { error: 'Dashboard not found or access denied' };

  // Delete widget
  const { error } = await supabase
    .from('dashboard_widgets')
    .delete()
    .eq('id', widgetId)
    .eq('dashboard_id', dashboardId);

  if (error) return { error: error.message };

  // Remove from layout
  const currentLayout = (dashboard.layout as LayoutItem[]) || [];
  const newLayout = currentLayout.filter((item) => item.i !== widgetId);

  await supabase
    .from('dashboards')
    .update({ layout: newLayout })
    .eq('id', dashboardId);

  revalidatePath(`/dashboards/${dashboardId}`);
  return { data: undefined };
}

// ============================================================================
// Save Layout
// ============================================================================

export async function saveLayout(
  input: z.infer<typeof saveLayoutSchema>
): Promise<ActionResult> {
  const userId = await getAuthUserId();
  if (!userId) return { error: 'Not authenticated' };

  const parsed = saveLayoutSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  // Update layout JSONB on dashboard
  const { error: layoutError } = await supabase
    .from('dashboards')
    .update({ layout: parsed.data.layout })
    .eq('id', parsed.data.dashboardId)
    .eq('owner_id', userId);

  if (layoutError) return { error: layoutError.message };

  // Update per-widget positions
  const updates = parsed.data.layout.map((item) =>
    supabase
      .from('dashboard_widgets')
      .update({ position: { x: item.x, y: item.y, w: item.w, h: item.h } })
      .eq('id', item.i)
      .eq('dashboard_id', parsed.data.dashboardId)
  );

  await Promise.all(updates);

  return { data: undefined };
}

// ============================================================================
// Create from Template
// ============================================================================

export async function createFromTemplate(
  templateId: string,
  name: string
): Promise<ActionResult<Dashboard>> {
  const userId = await getAuthUserId();
  if (!userId) return { error: 'Not authenticated' };

  const supabase = await createClient();

  // Fetch template
  const { data: template, error: tmplError } = await supabase
    .from('dashboards')
    .select(
      `
      *,
      dashboard_widgets (*)
    `
    )
    .eq('id', templateId)
    .eq('is_template', true)
    .single();

  if (tmplError || !template) return { error: 'Template not found' };

  // Create new dashboard
  const { data: newDashboard, error: createError } = await supabase
    .from('dashboards')
    .insert({
      owner_id: userId,
      name,
      description: template.description,
      layout: [], // Will be rebuilt
      is_template: false,
      is_shared: false,
      metadata: template.metadata,
    })
    .select()
    .single();

  if (createError || !newDashboard) return { error: createError?.message || 'Failed to create dashboard' };

  // Clone widgets
  const widgets = (template as DashboardWithWidgets).dashboard_widgets || [];
  const newLayout: LayoutItem[] = [];

  for (const widget of widgets) {
    const { data: newWidget, error: wError } = await supabase
      .from('dashboard_widgets')
      .insert({
        dashboard_id: newDashboard.id,
        data_asset_id: widget.data_asset_id,
        widget_type: widget.widget_type,
        parameters: widget.parameters,
        widget_config: widget.widget_config,
        position: widget.position,
      })
      .select('id')
      .single();

    if (wError || !newWidget) continue;

    newLayout.push({
      i: newWidget.id,
      x: widget.position.x,
      y: widget.position.y,
      w: widget.position.w,
      h: widget.position.h,
    });
  }

  // Update layout with new widget IDs
  await supabase
    .from('dashboards')
    .update({ layout: newLayout })
    .eq('id', newDashboard.id);

  revalidatePath('/dashboards');
  return { data: { ...newDashboard, layout: newLayout } as Dashboard };
}
