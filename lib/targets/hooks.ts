'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyTargets } from '@/app/targets/actions';

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
