'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyTargets } from '@/app/targets/actions';
import { getMyPerformance } from '@/app/performance/actions';

export function useMyTargets(monthStart: string) {
  return useQuery({
    queryKey: ['my-targets', monthStart],
    queryFn: async () => {
      const result = await getMyTargets(monthStart);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useMyPerformance(monthStart: string) {
  return useQuery({
    queryKey: ['my-performance', monthStart],
    queryFn: async () => {
      const result = await getMyPerformance(monthStart);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}
