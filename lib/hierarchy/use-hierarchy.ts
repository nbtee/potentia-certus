/**
 * Hierarchy Hooks
 *
 * TanStack Query hooks for hierarchy tree and consultant mapping.
 * Cached with 5min staleTime since hierarchy rarely changes.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchHierarchyTree,
  fetchConsultantMap,
  type HierarchyNode,
  type ConsultantEntry,
} from './resolve-scope';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export function useHierarchyTree() {
  return useQuery<HierarchyNode[]>({
    queryKey: ['hierarchy-tree'],
    queryFn: fetchHierarchyTree,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });
}

export function useConsultantMap() {
  return useQuery<ConsultantEntry[]>({
    queryKey: ['consultant-map'],
    queryFn: fetchConsultantMap,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });
}
