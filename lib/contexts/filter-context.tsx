/**
 * Filter Context
 *
 * Global state management for dashboard filters.
 * Provides date range and hierarchy scope to all widgets.
 */

'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface DateRange {
  start: string; // ISO date string
  end: string;
}

export type HierarchyScope = 'self' | 'my-team' | 'region' | 'national';

export interface FilterState {
  dateRange: DateRange;
  hierarchyScope: HierarchyScope;
  consultantId?: string;
  teamId?: string;
  regionId?: string;
}

interface FilterContextType {
  filters: FilterState;
  setDateRange: (range: DateRange) => void;
  setHierarchyScope: (scope: HierarchyScope) => void;
  setConsultantId: (id: string | undefined) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

// Helper to calculate date range from preset
export function calculateDateRange(preset: string): DateRange {
  const end = new Date();
  const start = new Date();

  switch (preset) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case 'quarter':
      start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
      break;
    case 'year':
      start.setMonth(0, 1);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

// Default filter state
const DEFAULT_FILTERS: FilterState = {
  dateRange: calculateDateRange('30d'),
  hierarchyScope: 'my-team',
};

export function FilterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize from URL params if available
  const [filters, setFilters] = useState<FilterState>(() => {
    const urlDateStart = searchParams.get('dateStart');
    const urlDateEnd = searchParams.get('dateEnd');
    const urlScope = searchParams.get('scope');
    const validScopes: HierarchyScope[] = ['self', 'my-team', 'region', 'national'];
    const scope = validScopes.includes(urlScope as HierarchyScope)
      ? (urlScope as HierarchyScope)
      : DEFAULT_FILTERS.hierarchyScope;

    return {
      dateRange: urlDateStart && urlDateEnd
        ? { start: urlDateStart, end: urlDateEnd }
        : DEFAULT_FILTERS.dateRange,
      hierarchyScope: scope,
    };
  });

  // Sync URL params whenever filters change (as a side effect, not during render)
  const isInitialMount = useRef(true);
  useEffect(() => {
    // Skip the initial mount — URL already has the right params (or defaults)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    params.set('dateStart', filters.dateRange.start);
    params.set('dateEnd', filters.dateRange.end);
    params.set('scope', filters.hierarchyScope);

    if (filters.consultantId) {
      params.set('consultantId', filters.consultantId);
    } else {
      params.delete('consultantId');
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [filters, pathname, router, searchParams]);

  const setDateRange = useCallback((range: DateRange) => {
    setFilters((prev) => ({ ...prev, dateRange: range }));
  }, []);

  const setHierarchyScope = useCallback((scope: HierarchyScope) => {
    setFilters((prev) => ({ ...prev, hierarchyScope: scope }));
  }, []);

  const setConsultantId = useCallback((id: string | undefined) => {
    setFilters((prev) => ({ ...prev, consultantId: id }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return (
    <FilterContext.Provider
      value={{
        filters,
        setDateRange,
        setHierarchyScope,
        setConsultantId,
        resetFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within FilterProvider');
  }
  return context;
}

// Helper hook for components that just need the date range
export function useDateRange() {
  const { filters } = useFilters();
  return filters.dateRange;
}
