/**
 * Filter Context
 *
 * Global state management for dashboard filters.
 * Provides date range and hierarchy scope to all widgets.
 */

'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface DateRange {
  start: string; // ISO date string
  end: string;
}

export interface FilterState {
  dateRange: DateRange;
  hierarchyScope: 'self' | 'my-team' | 'region' | 'national';
  consultantId?: string;
  teamId?: string;
  regionId?: string;
}

interface FilterContextType {
  filters: FilterState;
  setDateRange: (range: DateRange) => void;
  setHierarchyScope: (scope: FilterState['hierarchyScope']) => void;
  setConsultantId: (id: string | undefined) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

// Helper to calculate date range from preset
function calculateDateRange(preset: string): DateRange {
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
    const urlScope = searchParams.get('scope') as FilterState['hierarchyScope'];

    return {
      dateRange: urlDateStart && urlDateEnd
        ? { start: urlDateStart, end: urlDateEnd }
        : DEFAULT_FILTERS.dateRange,
      hierarchyScope: urlScope || DEFAULT_FILTERS.hierarchyScope,
    };
  });

  // Update URL params when filters change
  const updateUrlParams = useCallback((newFilters: FilterState) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set('dateStart', newFilters.dateRange.start);
    params.set('dateEnd', newFilters.dateRange.end);
    params.set('scope', newFilters.hierarchyScope);

    if (newFilters.consultantId) {
      params.set('consultantId', newFilters.consultantId);
    } else {
      params.delete('consultantId');
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const setDateRange = useCallback((range: DateRange) => {
    const newFilters = { ...filters, dateRange: range };
    setFilters(newFilters);
    updateUrlParams(newFilters);
  }, [filters, updateUrlParams]);

  const setHierarchyScope = useCallback((scope: FilterState['hierarchyScope']) => {
    const newFilters = { ...filters, hierarchyScope: scope };
    setFilters(newFilters);
    updateUrlParams(newFilters);
  }, [filters, updateUrlParams]);

  const setConsultantId = useCallback((id: string | undefined) => {
    const newFilters = { ...filters, consultantId: id };
    setFilters(newFilters);
    updateUrlParams(newFilters);
  }, [filters, updateUrlParams]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    updateUrlParams(DEFAULT_FILTERS);
  }, [updateUrlParams]);

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

// Helper to convert preset to date range (for external use)
export { calculateDateRange };
