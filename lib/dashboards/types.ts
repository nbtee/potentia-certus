/**
 * Dashboard Persistence Types
 *
 * Types for dashboards and dashboard_widgets tables.
 * Used by server actions, hooks, and UI components.
 */

import type { DataAsset, ShapeContract } from '@/lib/data-assets/types';

// ============================================================================
// Layout
// ============================================================================

/** react-grid-layout item position */
export interface LayoutItem {
  i: string; // widget id
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

// ============================================================================
// Widget Parameters (data-fetching concerns, stored in `parameters` JSONB)
// ============================================================================

export interface WidgetParameters {
  dimension?: string; // 'consultant', 'team', 'region', 'activity_type'
  limit?: number; // Top N
  filters?: Record<string, unknown>;
}

// ============================================================================
// Widget Config (presentation concerns, stored in `widget_config` JSONB)
// ============================================================================

export interface WidgetConfig {
  title?: string;
  colorScheme?: 'teal' | 'green' | 'purple' | 'orange';
  color?: string; // hex color for charts
  barColor?: string;
  lineColor?: string;
  chartType?: 'line' | 'area' | 'donut' | 'pie';
  orientation?: 'vertical' | 'horizontal';
  targetValue?: number;
  targetLabel?: string;
  icon?: string; // Lucide icon name
  fromLabel?: string;
  toLabel?: string;
  value?: number; // direct value for conversion indicators
  previousValue?: number;
  height?: number;
  pageSize?: number;
  showValues?: boolean;
  movingAverageDays?: number;
}

// ============================================================================
// Database Records
// ============================================================================

export interface Dashboard {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  layout: LayoutItem[];
  is_template: boolean;
  is_shared: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  data_asset_id: string;
  widget_type: string;
  parameters: WidgetParameters;
  widget_config: WidgetConfig;
  position: { x: number; y: number; w: number; h: number };
  created_at: string;
  updated_at: string;
  // Joined fields
  data_asset?: Pick<DataAsset, 'asset_key' | 'display_name' | 'output_shapes' | 'category'>;
}

export interface DashboardWithWidgets extends Dashboard {
  dashboard_widgets: DashboardWidget[];
}

// ============================================================================
// Inputs
// ============================================================================

export interface CreateDashboardInput {
  name: string;
  description?: string;
}

export interface AddWidgetInput {
  dashboardId: string;
  dataAssetId: string;
  widgetType: string;
  parameters?: WidgetParameters;
  widgetConfig?: WidgetConfig;
  position?: { x: number; y: number; w: number; h: number };
}

// ============================================================================
// Widget type → expected shape mapping (mirrors widget-registry)
// ============================================================================

export const WIDGET_TYPE_SHAPES: Record<string, ShapeContract> = {
  kpi_card: 'single_value',
  time_series_chart: 'time_series',
  bar_chart: 'categorical',
  donut_chart: 'categorical',
  target_gauge: 'single_value',
  leaderboard: 'categorical',
  combo_chart: 'time_series',
  conversion_indicator: 'single_value',
  data_table: 'tabular',
  heatmap: 'matrix',
  stacked_bar_chart: 'categorical',
};
