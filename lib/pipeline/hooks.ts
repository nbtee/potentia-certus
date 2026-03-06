'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPipelineData, getPipelineDrillDown } from '@/app/pipeline/actions';
import type { PipelineData, PipelineDrillDownRequest, PipelineDrillDownResult } from './types';

export function usePipelineData(monthStart: string, consultantIds: string[] | null) {
  const sortedIds = consultantIds ? [...consultantIds].sort() : null;

  return useQuery<PipelineData>({
    queryKey: ['pipeline', monthStart, sortedIds],
    queryFn: async (): Promise<PipelineData> => {
      const result = await getPipelineData(monthStart, consultantIds);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

const DRILL_DOWN_PAGE_SIZE = 25;

export function usePipelineDrillDownData(
  request: PipelineDrillDownRequest | null,
  monthStart: string
) {
  const [page, setPage] = useState(1);

  // Reset page when request changes
  const requestKey = request
    ? `${request.consultantIds.join(',')}|${request.status}|${request.teamType}`
    : null;
  useEffect(() => {
    setPage(1);
  }, [requestKey]);

  const sortedIds = request?.consultantIds ? [...request.consultantIds].sort() : null;

  const query = useQuery<PipelineDrillDownResult>({
    queryKey: ['pipeline-drill-down', sortedIds, request?.status, request?.teamType, monthStart, page],
    queryFn: async (): Promise<PipelineDrillDownResult> => {
      if (!request) throw new Error('No request');
      const result = await getPipelineDrillDown(
        request.consultantIds,
        request.status,
        monthStart,
        request.teamType,
        page,
        DRILL_DOWN_PAGE_SIZE
      );
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    enabled: !!request,
    staleTime: 60 * 1000,
  });

  const totalRows = query.data?.totalRows ?? 0;
  const totalPages = Math.ceil(totalRows / DRILL_DOWN_PAGE_SIZE);

  return {
    rows: query.data?.rows ?? [],
    totalRows,
    page,
    pageSize: DRILL_DOWN_PAGE_SIZE,
    totalPages,
    setPage,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}
