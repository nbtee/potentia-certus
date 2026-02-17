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

// Data asset from database — matches actual DB schema
export interface DataAsset {
  id: string;
  asset_key: string;
  display_name: string;
  description: string | null;
  category: DataAssetCategory;
  synonyms: string[];
  output_shapes: ShapeContract[];
  available_dimensions: string[];
  available_filters: string[];
  query_template: string | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Query parameters for data asset execution
export interface DataAssetQueryParams {
  assetKey: string;
  startDate?: string;
  endDate?: string;
  groupBy?: string;
  filters?: Record<string, unknown>;
}
