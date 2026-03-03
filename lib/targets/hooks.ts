'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyTargets } from '@/app/targets/actions';
import { getMyPerformance } from '@/app/performance/actions';
import { useFilters } from '@/lib/contexts/filter-context';
import { createClient } from '@/lib/supabase/client';
import { ASSET_TO_TARGET_KEYS } from './constants';

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

/**
 * Returns the pro-rated target value for a given asset key and date range.
 * Aggregates targets across all consultants in the current scope.
 */
export function useTargetForAsset(
  assetKey: string,
  dateRange?: { start: string; end: string }
): { targetValue: number | null; isLoading: boolean } {
  const { resolvedConsultantIds, isScopeLoading } = useFilters();
  const targetKeys = ASSET_TO_TARGET_KEYS[assetKey];
  const enabled = Boolean(targetKeys && dateRange && !isScopeLoading);

  const { data, isLoading } = useQuery({
    queryKey: [
      'target-for-asset',
      assetKey,
      resolvedConsultantIds ? [...resolvedConsultantIds].sort() : 'national',
      dateRange?.start,
      dateRange?.end,
    ],
    queryFn: async () => {
      if (!targetKeys || !dateRange) return null;

      const supabase = createClient();
      const rangeStart = new Date(dateRange.start + 'T00:00:00');
      const rangeEnd = new Date(dateRange.end + 'T00:00:00');

      // Find all months that overlap the date range
      const firstMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      const lastMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

      const monthStarts: string[] = [];
      const current = new Date(firstMonth);
      while (current <= lastMonth) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        monthStarts.push(`${y}-${m}-01`);
        current.setMonth(current.getMonth() + 1);
      }

      // Fetch targets for consultants in scope
      let query = supabase
        .from('consultant_targets')
        .select('target_type, target_value, period_start')
        .in('target_type', targetKeys)
        .in('period_start', monthStarts);

      // null = national (all consultants), otherwise filter to scope
      if (resolvedConsultantIds !== null) {
        if (resolvedConsultantIds.length === 1) {
          query = query.eq('consultant_id', resolvedConsultantIds[0]);
        } else {
          query = query.in('consultant_id', resolvedConsultantIds);
        }
      }

      const { data: rows, error } = await query;

      if (error || !rows || rows.length === 0) return null;

      // Build lookup: "period_start:target_type" → summed value across consultants
      const lookup = new Map<string, number>();
      for (const row of rows) {
        const key = `${row.period_start}:${row.target_type}`;
        lookup.set(key, (lookup.get(key) ?? 0) + Number(row.target_value));
      }

      // Pro-rate and sum across months
      let totalTarget = 0;
      for (const ms of monthStarts) {
        const monthDate = new Date(ms + 'T00:00:00');
        const daysInMonth = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth() + 1,
          0
        ).getDate();

        // Calculate overlap between date range and this month
        const monthFirst = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthLast = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        const overlapStart = rangeStart > monthFirst ? rangeStart : monthFirst;
        const overlapEnd = rangeEnd < monthLast ? rangeEnd : monthLast;
        const overlapDays =
          Math.floor(
            (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)
          ) + 1;

        if (overlapDays <= 0) continue;

        const fraction = overlapDays / daysInMonth;

        // Sum all target types for this month (composite assets like client_call_count)
        let monthSum = 0;
        let hasAny = false;
        for (const tk of targetKeys) {
          const val = lookup.get(`${ms}:${tk}`);
          if (val != null) {
            monthSum += val;
            hasAny = true;
          }
        }

        if (hasAny) {
          totalTarget += monthSum * fraction;
        }
      }

      return totalTarget > 0 ? totalTarget : null;
    },
    enabled,
    staleTime: 60_000,
  });

  return {
    targetValue: enabled ? (data ?? null) : null,
    isLoading: enabled ? isLoading : false,
  };
}
