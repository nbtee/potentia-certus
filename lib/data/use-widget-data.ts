/**
 * useWidgetData Hook
 *
 * React hook for fetching widget data using TanStack Query.
 * Provides caching, deduplication, and automatic refetching.
 *
 * Automatically injects resolved consultant IDs from the scope filter
 * so individual widgets don't need to know about hierarchy scoping.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryDataAsset } from './data-asset-queries';
import type { DataAssetParams, DataAssetResponse } from './shape-contracts';
import { useResolvedScope } from '@/lib/contexts/filter-context';

export interface UseWidgetDataOptions extends DataAssetParams {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useWidgetData(options: UseWidgetDataOptions) {
  const { enabled = true, refetchInterval, ...params } = options;
  const { consultantIds, isLoading: scopeLoading } = useResolvedScope();

  // Merge scope consultant IDs into params
  const mergedParams: DataAssetParams = {
    ...params,
    filters: {
      ...params.filters,
      consultantIds,
    },
  };

  // Serialize query key deterministically to avoid cache misses from reference changes
  // Include sorted consultant IDs for proper cache invalidation on scope change
  const sortedIds = consultantIds ? [...consultantIds].sort() : null;
  const queryKey = [
    'widget-data',
    params.assetKey,
    params.shape,
    params.filters?.dateRange?.start ?? null,
    params.filters?.dateRange?.end ?? null,
    sortedIds,
    params.dimensions ?? null,
    params.limit ?? null,
  ];

  return useQuery<DataAssetResponse>({
    queryKey,
    queryFn: () => queryDataAsset(mergedParams),
    enabled: enabled && !scopeLoading,
    staleTime: 60 * 1000, // 60 seconds
    refetchOnWindowFocus: true,
    refetchInterval,
  });
}
