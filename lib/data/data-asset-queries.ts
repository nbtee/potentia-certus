/**
 * Data Asset Query Functions
 *
 * Queries data assets from Supabase and returns data in shape contract formats.
 * All queries respect RLS and hierarchy scoping.
 */

import { createClient } from '@/lib/supabase/client';
import type { DataAsset } from '@/lib/data-assets/types';
import type {
  DataAssetParams,
  DataAssetResponse,
  SingleValue,
  Categorical,
  TimeSeries,
  Tabular,
} from './shape-contracts';

type SupabaseClient = ReturnType<typeof createClient>;

// ============================================================================
// Main Query Function
// ============================================================================

export async function queryDataAsset(
  params: DataAssetParams
): Promise<DataAssetResponse> {
  const startTime = Date.now();
  const supabase = createClient();

  // Fetch the data asset definition
  const { data: asset, error: assetError } = await supabase
    .from('data_assets')
    .select('*')
    .eq('asset_key', params.assetKey)
    .single();

  if (assetError || !asset) {
    throw new Error(`Data asset not found: ${params.assetKey}`);
  }

  const typedAsset = asset as DataAsset;

  // Verify the requested shape is supported
  if (!typedAsset.output_shapes.includes(params.shape)) {
    throw new Error(
      `Shape "${params.shape}" not supported for asset "${params.assetKey}". ` +
        `Supported shapes: ${typedAsset.output_shapes.join(', ')}`
    );
  }

  // Route to appropriate shape query
  let data;
  switch (params.shape) {
    case 'single_value':
      data = await querySingleValue(supabase, typedAsset, params);
      break;
    case 'categorical':
      data = await queryCategorical(supabase, typedAsset, params);
      break;
    case 'time_series':
      data = await queryTimeSeries(supabase, typedAsset, params);
      break;
    case 'tabular':
      data = await queryTabular(supabase, typedAsset, params);
      break;
    default:
      throw new Error(`Shape not implemented: ${params.shape}`);
  }

  const queryTime = Date.now() - startTime;

  return {
    data,
    metadata: {
      assetKey: params.assetKey,
      queryTime,
      recordCount: getRecordCount(data),
      cached: false,
      generatedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Shape-Specific Query Functions
// ============================================================================

async function querySingleValue(
  supabase: SupabaseClient,
  asset: DataAsset,
  params: DataAssetParams
): Promise<SingleValue> {
  const activityTypes = (asset.metadata as Record<string, unknown>)?.activity_types as string[] ?? [];

  // Build the query
  let query = supabase
    .from('activities')
    .select('id', { count: 'exact', head: false });

  // Apply filters
  if (activityTypes.length > 0) {
    query = query.in('activity_type', activityTypes);
  }

  if (params.filters?.dateRange) {
    query = query
      .gte('activity_date', params.filters.dateRange.start)
      .lte('activity_date', params.filters.dateRange.end);
  }

  if (params.filters?.consultantId) {
    query = query.eq('consultant_id', params.filters.consultantId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Query failed: ${error.message}`);
  }

  // Calculate comparison if we have a date range
  let comparison: SingleValue['comparison'];
  if (params.filters?.dateRange) {
    const { start, end } = params.filters.dateRange;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Compare to previous period
    const prevEnd = new Date(startDate);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - daysDiff);

    let prevQuery = supabase
      .from('activities')
      .select('id', { count: 'exact', head: false });

    if (activityTypes.length > 0) {
      prevQuery = prevQuery.in('activity_type', activityTypes);
    }

    prevQuery = prevQuery
      .gte('activity_date', prevStart.toISOString().split('T')[0])
      .lte('activity_date', prevEnd.toISOString().split('T')[0]);

    if (params.filters?.consultantId) {
      prevQuery = prevQuery.eq('consultant_id', params.filters.consultantId);
    }

    const { count: prevCount } = await prevQuery;

    if (prevCount !== null && prevCount > 0) {
      const change = ((count || 0) - prevCount) / prevCount;
      comparison = {
        value: Math.abs(change),
        label: `vs previous ${daysDiff} days`,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      };
    }
  }

  return {
    _shape: 'single_value',
    value: count || 0,
    label: asset.display_name,
    format: 'number',
    comparison,
  };
}

async function queryCategorical(
  supabase: SupabaseClient,
  asset: DataAsset,
  params: DataAssetParams
): Promise<Categorical> {
  const activityTypes = (asset.metadata as Record<string, unknown>)?.activity_types as string[] ?? [];

  // Select with join to user_profiles to get display names
  let query = supabase
    .from('activities')
    .select('consultant_id, user_profiles(display_name, first_name, last_name)');

  // Apply filters
  if (activityTypes.length > 0) {
    query = query.in('activity_type', activityTypes);
  }

  if (params.filters?.dateRange) {
    query = query
      .gte('activity_date', params.filters.dateRange.start)
      .lte('activity_date', params.filters.dateRange.end);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Query failed: ${error.message}`);
  }

  // Group and count by consultant
  const grouped = new Map<string, { count: number; name: string }>();

  for (const row of data || []) {
    const consultantId = row.consultant_id;
    // Supabase returns joined data as an object (not array) for single foreign key relations
    const profile = Array.isArray(row.user_profiles)
      ? row.user_profiles[0]
      : row.user_profiles;

    // Get display name (fallback to first + last name, then "Unknown")
    const displayName =
      profile?.display_name ||
      (profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile?.first_name || profile?.last_name || 'Unknown');

    if (consultantId) {
      const existing = grouped.get(consultantId) || { count: 0, name: displayName };
      grouped.set(consultantId, {
        count: existing.count + 1,
        name: displayName,
      });
    }
  }

  // Convert to categories array and sort by value
  const categories = Array.from(grouped.values())
    .map(({ name, count }) => ({ label: name, value: count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, params.limit || 10);

  return {
    _shape: 'categorical',
    categories,
    format: 'number',
  };
}

async function queryTimeSeries(
  supabase: SupabaseClient,
  asset: DataAsset,
  params: DataAssetParams
): Promise<TimeSeries> {
  const activityTypes = (asset.metadata as Record<string, unknown>)?.activity_types as string[] ?? [];

  let query = supabase.from('activities').select('activity_date');

  // Apply filters
  if (activityTypes.length > 0) {
    query = query.in('activity_type', activityTypes);
  }

  if (params.filters?.dateRange) {
    query = query
      .gte('activity_date', params.filters.dateRange.start)
      .lte('activity_date', params.filters.dateRange.end);
  }

  if (params.filters?.consultantId) {
    query = query.eq('consultant_id', params.filters.consultantId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Query failed: ${error.message}`);
  }

  // Group by date
  const grouped = new Map<string, number>();

  for (const row of data || []) {
    const date = row.activity_date;
    grouped.set(date, (grouped.get(date) || 0) + 1);
  }

  // Convert to time series format
  const sortedDates = Array.from(grouped.keys()).sort();
  const seriesData = sortedDates.map((date) => ({
    date,
    value: grouped.get(date) || 0,
  }));

  return {
    _shape: 'time_series',
    series: [
      {
        name: asset.display_name,
        data: seriesData,
      },
    ],
    format: 'number',
    interval: 'day',
  };
}

async function queryTabular(
  supabase: SupabaseClient,
  asset: DataAsset,
  params: DataAssetParams
): Promise<Tabular> {
  const activityTypes = (asset.metadata as Record<string, unknown>)?.activity_types as string[] ?? [];

  let query = supabase.from('activities').select('*', { count: 'exact' });

  // Apply filters
  if (activityTypes.length > 0) {
    query = query.in('activity_type', activityTypes);
  }

  if (params.filters?.dateRange) {
    query = query
      .gte('activity_date', params.filters.dateRange.start)
      .lte('activity_date', params.filters.dateRange.end);
  }

  if (params.filters?.consultantId) {
    query = query.eq('consultant_id', params.filters.consultantId);
  }

  // Apply pagination
  const limit = params.limit || 50;
  const offset = params.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Query failed: ${error.message}`);
  }

  return {
    _shape: 'tabular',
    columns: [
      { key: 'activity_date', label: 'Date', type: 'date', format: 'date' },
      { key: 'activity_type', label: 'Type', type: 'string' },
      { key: 'consultant_id', label: 'Consultant', type: 'string' },
      { key: 'notes', label: 'Notes', type: 'string' },
    ],
    rows: data || [],
    totalRows: count || 0,
    pagination: {
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getRecordCount(data: SingleValue | Categorical | TimeSeries | Tabular): number {
  switch (data._shape) {
    case 'single_value':
      return 1;
    case 'categorical':
      return data.categories.length;
    case 'time_series':
      return data.series[0]?.data.length || 0;
    case 'tabular':
      return data.rows.length;
  }
}
