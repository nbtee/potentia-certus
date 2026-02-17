/**
 * Widget Type Registry
 *
 * Maps widget_type strings (from DB/AI) to React components and their expected shapes.
 * Used by Stage F (Dashboard Persistence) and Stage H (AI Orchestration).
 */

import type { ComponentType } from 'react';
import type { ShapeContract } from '@/lib/data-assets/types';

export interface WidgetRegistryEntry {
  component: ComponentType<Record<string, unknown>>;
  expectedShape: ShapeContract;
  label: string;
  description: string;
}

// Lazy registry: components are resolved at import time to keep this file lightweight.
// Actual components are imported dynamically by the dashboard renderer.
export const WIDGET_REGISTRY: Record<
  string,
  Omit<WidgetRegistryEntry, 'component'> & { importPath: string }
> = {
  kpi_card: {
    expectedShape: 'single_value',
    label: 'KPI Card',
    description: 'Single metric with comparison',
    importPath: '@/components/widgets/kpi-card',
  },
  time_series_chart: {
    expectedShape: 'time_series',
    label: 'Time Series Chart',
    description: 'Line or area chart showing trends over time',
    importPath: '@/components/widgets/time-series-chart',
  },
  bar_chart: {
    expectedShape: 'categorical',
    label: 'Bar Chart',
    description: 'Vertical or horizontal bar chart',
    importPath: '@/components/widgets/bar-chart',
  },
  donut_chart: {
    expectedShape: 'categorical',
    label: 'Donut/Pie Chart',
    description: 'Circular chart showing proportions',
    importPath: '@/components/widgets/donut-chart',
  },
  target_gauge: {
    expectedShape: 'single_value',
    label: 'Target Gauge',
    description: 'Radial gauge showing progress towards target',
    importPath: '@/components/widgets/target-gauge',
  },
  leaderboard: {
    expectedShape: 'categorical',
    label: 'Leaderboard',
    description: 'Animated ranked list with medal icons',
    importPath: '@/components/widgets/animated-leaderboard',
  },
  combo_chart: {
    expectedShape: 'time_series',
    label: 'Combo Chart',
    description: 'Bar chart with moving average line overlay',
    importPath: '@/components/widgets/time-series-combo',
  },
  conversion_indicator: {
    expectedShape: 'single_value',
    label: 'Conversion Indicator',
    description: 'Small card showing conversion percentage',
    importPath: '@/components/widgets/conversion-indicator',
  },
  data_table: {
    expectedShape: 'tabular',
    label: 'Data Table',
    description: 'Sortable, paginated table with drill-through',
    importPath: '@/components/widgets/data-table',
  },
  heatmap: {
    expectedShape: 'matrix',
    label: 'Heatmap',
    description: 'Color-coded matrix grid (consultant x activity)',
    importPath: '@/components/widgets/heatmap',
  },
  stacked_bar_chart: {
    expectedShape: 'categorical',
    label: 'Stacked Bar Chart',
    description: 'Multi-series stacked bar chart',
    importPath: '@/components/widgets/stacked-bar-chart',
  },
};

/** Get all widget type keys */
export function getWidgetTypes(): string[] {
  return Object.keys(WIDGET_REGISTRY);
}

/** Get registry entry for a widget type */
export function getWidgetEntry(
  widgetType: string
): (typeof WIDGET_REGISTRY)[string] | undefined {
  return WIDGET_REGISTRY[widgetType];
}

/** Get the expected shape for a widget type */
export function getExpectedShape(widgetType: string): ShapeContract | undefined {
  return WIDGET_REGISTRY[widgetType]?.expectedShape;
}
