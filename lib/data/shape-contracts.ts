/**
 * Shape Contracts - Data format specifications
 *
 * Widgets consume data in standardized shapes. Data assets produce data
 * in these shapes. This decouples widgets from data sources.
 */

// ============================================================================
// Core Shape Types
// ============================================================================

/**
 * Single value with optional comparison
 * Used for: KPI cards, gauges, simple metrics
 */
export interface SingleValue {
  value: number;
  label: string;
  format?: 'number' | 'currency' | 'percentage' | 'duration';
  comparison?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
}

/**
 * Categorical data (categories with values)
 * Used for: Bar charts, pie charts, donut charts
 */
export interface Categorical {
  categories: Array<{
    label: string;
    value: number;
    metadata?: Record<string, unknown>;
  }>;
  format?: 'number' | 'currency' | 'percentage';
}

/**
 * Time series data
 * Used for: Line charts, area charts, sparklines
 */
export interface TimeSeries {
  series: Array<{
    name: string;
    data: Array<{
      date: string; // ISO date string
      value: number;
    }>;
  }>;
  format?: 'number' | 'currency' | 'percentage';
  interval?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

/**
 * Funnel stages (conversion funnel)
 * Used for: Funnel charts, conversion indicators
 */
export interface FunnelStages {
  stages: Array<{
    name: string;
    value: number;
    conversionRate?: number;
  }>;
  format?: 'number' | 'currency' | 'percentage';
}

/**
 * Matrix data (2D grid of values)
 * Used for: Heatmaps, correlation matrices
 */
export interface Matrix {
  rows: string[];
  columns: string[];
  values: number[][];
  format?: 'number' | 'currency' | 'percentage';
}

/**
 * Tabular data (rows and columns)
 * Used for: Data tables, leaderboards
 */
export interface Tabular<T = Record<string, unknown>> {
  columns: Array<{
    key: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    format?: 'currency' | 'percentage' | 'date' | 'datetime';
  }>;
  rows: T[];
  totalRows?: number;
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ============================================================================
// Union Type for All Shapes
// ============================================================================

export type DataShape =
  | SingleValue
  | Categorical
  | TimeSeries
  | FunnelStages
  | Matrix
  | Tabular;

// ============================================================================
// Data Asset Query Parameters
// ============================================================================

export interface DataAssetParams {
  assetKey: string;
  shape: 'single_value' | 'categorical' | 'time_series' | 'funnel_stages' | 'matrix' | 'tabular';
  filters?: {
    dateRange?: {
      start: string; // ISO date
      end: string; // ISO date
    };
    hierarchyNodeId?: string;
    consultantId?: string;
    teamId?: string;
    regionId?: string;
    additionalFilters?: Record<string, unknown>;
  };
  dimensions?: string[]; // For group-by operations (e.g., ['region', 'team'])
  limit?: number; // For tabular data
  offset?: number; // For tabular data
}

// ============================================================================
// Data Asset Response
// ============================================================================

export interface DataAssetResponse<T extends DataShape = DataShape> {
  data: T;
  metadata: {
    assetKey: string;
    queryTime: number; // milliseconds
    recordCount: number;
    cached: boolean;
    generatedAt: string; // ISO timestamp
  };
}

// ============================================================================
// Type Guards
// ============================================================================

export function isSingleValue(data: DataShape): data is SingleValue {
  return 'value' in data && 'label' in data;
}

export function isCategorical(data: DataShape): data is Categorical {
  return 'categories' in data && Array.isArray(data.categories);
}

export function isTimeSeries(data: DataShape): data is TimeSeries {
  return 'series' in data && Array.isArray(data.series);
}

export function isFunnelStages(data: DataShape): data is FunnelStages {
  return 'stages' in data && Array.isArray(data.stages);
}

export function isMatrix(data: DataShape): data is Matrix {
  return 'rows' in data && 'columns' in data && 'values' in data;
}

export function isTabular(data: DataShape): data is Tabular {
  return 'columns' in data && 'rows' in data && Array.isArray(data.columns);
}
