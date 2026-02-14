/**
 * Data Asset Types
 * Based on the three-library architecture:
 * Data Assets (abstract measures) -> Shape Contracts -> Widgets
 */

// Shape contract types that widgets understand
export type ShapeContract =
  | 'single_value'
  | 'categorical'
  | 'time_series'
  | 'funnel_stages'
  | 'matrix'
  | 'tabular';

// Data asset category
export type DataAssetCategory =
  | 'revenue'
  | 'activity'
  | 'pipeline'
  | 'performance'
  | 'engagement';

// Data asset from database
export interface DataAsset {
  asset_key: string;
  display_name: string;
  description: string | null;
  category: DataAssetCategory;
  shape_contract: ShapeContract;
  requires_time_range: boolean;
  requires_grouping: boolean;
  sql_template: string;
  created_at: string;
  updated_at: string;
}

// Query parameters for data asset execution
export interface DataAssetQueryParams {
  assetKey: string;
  startDate?: string;
  endDate?: string;
  groupBy?: string;
  filters?: Record<string, any>;
}

// Generic shape contract data structures
export interface SingleValueData {
  value: number;
  label: string;
  change?: number;
  changeType?: 'increase' | 'decrease';
}

export interface CategoricalData {
  categories: Array<{
    label: string;
    value: number;
    percentage?: number;
  }>;
}

export interface TimeSeriesData {
  series: Array<{
    date: string;
    value: number;
    label?: string;
  }>;
}

export interface FunnelStageData {
  stages: Array<{
    stage: string;
    count: number;
    percentage: number;
    conversionRate?: number;
  }>;
}

export interface MatrixData {
  rows: string[];
  columns: string[];
  values: number[][];
}

export interface TabularData {
  columns: Array<{
    key: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'boolean';
  }>;
  rows: Array<Record<string, any>>;
  totalRows?: number;
}
