/**
 * Widget Resolver
 *
 * Maps widget_type strings to actual React components and builds
 * the correct props from DB-stored parameters + widget_config.
 */

import type { ComponentType } from 'react';
import type { DashboardWidget, WidgetConfig, WidgetParameters } from '@/lib/dashboards/types';
import type { DateRange } from '@/lib/contexts/filter-context';

import {
  KPICard,
  TimeSeriesChart,
  BarChart,
  DonutChart,
  TargetGauge,
  AnimatedLeaderboard,
  TimeSeriesCombo,
  ConversionIndicator,
  DataTable,
  Heatmap,
  StackedBarChart,
} from '@/components/widgets';

import {
  Phone,
  Users,
  Coffee,
  TrendingUp,
  UserCheck,
  BarChart3,
  Target,
  Activity,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Component Map
// ============================================================================

// Widget components accept varying prop types; buildWidgetProps() ensures
// correct props at runtime per widget type.
export const WIDGET_COMPONENTS: Record<string, ComponentType<Record<string, unknown>>> = {
  kpi_card: KPICard as unknown as ComponentType<Record<string, unknown>>,
  time_series_chart: TimeSeriesChart as unknown as ComponentType<Record<string, unknown>>,
  bar_chart: BarChart as unknown as ComponentType<Record<string, unknown>>,
  donut_chart: DonutChart as unknown as ComponentType<Record<string, unknown>>,
  target_gauge: TargetGauge as unknown as ComponentType<Record<string, unknown>>,
  leaderboard: AnimatedLeaderboard as unknown as ComponentType<Record<string, unknown>>,
  combo_chart: TimeSeriesCombo as unknown as ComponentType<Record<string, unknown>>,
  conversion_indicator: ConversionIndicator as unknown as ComponentType<Record<string, unknown>>,
  data_table: DataTable as unknown as ComponentType<Record<string, unknown>>,
  heatmap: Heatmap as unknown as ComponentType<Record<string, unknown>>,
  stacked_bar_chart: StackedBarChart as unknown as ComponentType<Record<string, unknown>>,
};

// ============================================================================
// Icon Resolver
// ============================================================================

const ICON_MAP: Record<string, LucideIcon> = {
  phone: Phone,
  users: Users,
  coffee: Coffee,
  trending_up: TrendingUp,
  user_check: UserCheck,
  bar_chart: BarChart3,
  target: Target,
  activity: Activity,
  briefcase: Briefcase,
};

export function resolveIcon(name?: string): LucideIcon {
  if (!name) return Activity;
  return ICON_MAP[name.toLowerCase()] ?? Activity;
}

// ============================================================================
// Default Widget Sizes
// ============================================================================

export const DEFAULT_WIDGET_SIZES: Record<
  string,
  { w: number; h: number; minW: number; minH: number }
> = {
  kpi_card: { w: 3, h: 2, minW: 2, minH: 2 },
  time_series_chart: { w: 6, h: 4, minW: 4, minH: 3 },
  bar_chart: { w: 6, h: 4, minW: 4, minH: 3 },
  donut_chart: { w: 6, h: 4, minW: 4, minH: 3 },
  target_gauge: { w: 3, h: 3, minW: 2, minH: 2 },
  leaderboard: { w: 6, h: 5, minW: 4, minH: 3 },
  combo_chart: { w: 6, h: 4, minW: 4, minH: 3 },
  conversion_indicator: { w: 3, h: 2, minW: 2, minH: 2 },
  data_table: { w: 12, h: 5, minW: 6, minH: 3 },
  heatmap: { w: 12, h: 5, minW: 6, minH: 4 },
  stacked_bar_chart: { w: 6, h: 4, minW: 4, minH: 3 },
};

// ============================================================================
// Prop Builder
// ============================================================================

export function buildWidgetProps(
  widget: DashboardWidget,
  dateRange: DateRange
): Record<string, unknown> {
  const assetKey = widget.data_asset?.asset_key ?? '';
  const params: WidgetParameters = widget.parameters || {};
  const config: WidgetConfig = widget.widget_config || {};

  // Base props shared by all data-fetching widgets
  const base: Record<string, unknown> = {
    assetKey,
    dateRange,
  };

  // Add dimension/limit from parameters
  if (params.dimension) base.dimension = params.dimension;
  if (params.limit) base.limit = params.limit;

  // Merge widget_config based on widget type
  switch (widget.widget_type) {
    case 'kpi_card':
      return {
        ...base,
        icon: resolveIcon(config.icon),
        colorScheme: config.colorScheme || 'teal',
      };

    case 'time_series_chart':
      return {
        ...base,
        title: config.title || widget.data_asset?.display_name || 'Chart',
        chartType: config.chartType || 'area',
        color: config.color || '#3b82f6',
        height: config.height,
      };

    case 'bar_chart':
      return {
        ...base,
        title: config.title || widget.data_asset?.display_name || 'Bar Chart',
        orientation: config.orientation || 'vertical',
        color: config.color || '#3b82f6',
        showValues: config.showValues,
        height: config.height,
      };

    case 'donut_chart':
      return {
        ...base,
        title: config.title || widget.data_asset?.display_name || 'Donut Chart',
        chartType: config.chartType || 'donut',
        height: config.height,
      };

    case 'target_gauge':
      return {
        ...base,
        title: config.title || widget.data_asset?.display_name || 'Gauge',
        targetValue: config.targetValue || 100,
        targetLabel: config.targetLabel,
      };

    case 'leaderboard':
      return {
        ...base,
        title: config.title || widget.data_asset?.display_name || 'Leaderboard',
      };

    case 'combo_chart':
      return {
        ...base,
        title: config.title || widget.data_asset?.display_name || 'Combo Chart',
        barColor: config.barColor || '#3b82f6',
        lineColor: config.lineColor || '#ef4444',
        movingAverageDays: config.movingAverageDays,
        height: config.height,
      };

    case 'conversion_indicator':
      return {
        title: config.title || 'Conversion',
        fromLabel: config.fromLabel,
        toLabel: config.toLabel,
        value: config.value,
        previousValue: config.previousValue,
        colorScheme: config.colorScheme || 'teal',
        // conversion_indicator can work with assetKey OR direct values
        ...(assetKey ? { assetKey, dateRange } : {}),
      };

    case 'data_table':
      return {
        ...base,
        title: config.title || widget.data_asset?.display_name || 'Data Table',
        pageSize: config.pageSize || 10,
      };

    case 'heatmap':
      return {
        ...base,
        title: config.title || widget.data_asset?.display_name || 'Heatmap',
        height: config.height || 400,
      };

    case 'stacked_bar_chart':
      return {
        ...base,
        title: config.title || widget.data_asset?.display_name || 'Stacked Bar',
        height: config.height,
      };

    default:
      return base;
  }
}
