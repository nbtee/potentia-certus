'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryDrillDown, type DrillDownResult } from './data-asset-queries';
import { useResolvedScope } from '@/lib/contexts/filter-context';
import { useFilters } from '@/lib/contexts/filter-context';
import { drillDownColumns, getActivityColumns, type DrillDownColumn } from './drill-down-columns';
import { createClient } from '@/lib/supabase/client';
import type { DataAsset } from '@/lib/data-assets/types';

const PAGE_SIZE = 25;

export interface UseDrillDownDataReturn {
  rows: Record<string, unknown>[];
  columns: DrillDownColumn[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  error: string | null;
  sourceTable: string;
}

export function useDrillDownData(assetKey: string | null): UseDrillDownDataReturn {
  const [page, setPage] = useState(1);
  const { consultantIds, isLoading: scopeLoading } = useResolvedScope();
  const { filters } = useFilters();

  // Reset page to 1 whenever the asset or scope changes
  const prevAssetKey = useRef(assetKey);
  const sortedIds = consultantIds ? [...consultantIds].sort() : null;
  const scopeKey = sortedIds?.join(',') ?? 'national';
  const prevScopeKey = useRef(scopeKey);

  useEffect(() => {
    if (prevAssetKey.current !== assetKey || prevScopeKey.current !== scopeKey) {
      setPage(1);
      prevAssetKey.current = assetKey;
      prevScopeKey.current = scopeKey;
    }
  }, [assetKey, scopeKey]);

  // Fetch asset metadata to resolve source table
  const { data: assetData } = useQuery({
    queryKey: ['drill-down-asset', assetKey],
    queryFn: async () => {
      if (!assetKey) return null;
      const supabase = createClient();
      const { data } = await supabase
        .from('data_assets')
        .select('metadata')
        .eq('asset_key', assetKey)
        .single();
      return data as Pick<DataAsset, 'metadata'> | null;
    },
    enabled: !!assetKey,
    staleTime: 5 * 60 * 1000,
  });

  const sourceTable = (() => {
    const src = (assetData?.metadata as Record<string, unknown>)?.source_table as string | undefined;
    switch (src) {
      case 'job_orders': return 'job_orders';
      case 'submission_status_log': return 'submission_status_log';
      case 'placements': return 'placements';
      case 'strategic_referrals': return 'strategic_referrals';
      default: return 'activities';
    }
  })();

  // For activities, resolve columns dynamically based on asset's activity types
  const activityTypes = (assetData?.metadata as Record<string, unknown>)?.activity_types as string[] ?? [];
  const columns = sourceTable === 'activities'
    ? getActivityColumns(activityTypes)
    : (drillDownColumns[sourceTable] || drillDownColumns.activities);

  const { data, isLoading: queryLoading, error } = useQuery<DrillDownResult>({
    queryKey: [
      'drill-down',
      assetKey,
      page,
      filters.dateRange.start,
      filters.dateRange.end,
      sortedIds,
    ],
    queryFn: () =>
      queryDrillDown({
        assetKey: assetKey!,
        filters: {
          dateRange: filters.dateRange,
          consultantIds,
        },
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: !!assetKey && !scopeLoading,
    staleTime: 60 * 1000,
    retry: 1,
  });

  return {
    rows: data?.rows ?? [],
    columns,
    totalRows: data?.totalRows ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil((data?.totalRows ?? 0) / PAGE_SIZE),
    setPage,
    isLoading: queryLoading || scopeLoading,
    error: error ? (error instanceof Error ? error.message : 'Query failed') : null,
    sourceTable,
  };
}
