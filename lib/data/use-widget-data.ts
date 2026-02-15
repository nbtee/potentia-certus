/**
 * useWidgetData Hook
 *
 * React hook for fetching widget data using TanStack Query.
 * Provides caching, deduplication, and automatic refetching.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryDataAsset } from './data-asset-queries';
import type { DataAssetParams, DataAssetResponse } from './shape-contracts';

export interface UseWidgetDataOptions extends DataAssetParams {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useWidgetData(options: UseWidgetDataOptions) {
  const { enabled = true, refetchInterval, ...params } = options;

  return useQuery<DataAssetResponse>({
    queryKey: ['widget-data', params],
    queryFn: () => queryDataAsset(params),
    enabled,
    staleTime: 60 * 1000, // 60 seconds
    refetchOnWindowFocus: true,
    refetchInterval: refetchInterval,
  });
}
