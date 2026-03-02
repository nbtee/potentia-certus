/**
 * Filter Context
 *
 * Global state management for dashboard filters.
 * Provides date range and hierarchy scope to all widgets.
 *
 * Scope is resolved to consultant UUIDs so widgets can filter data
 * without knowing about the hierarchy structure.
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useHierarchyTree, useConsultantMap } from '@/lib/hierarchy/use-hierarchy';
import {
  expandNodeIds,
  resolveConsultantIds,
  getTeamSiblingIds,
} from '@/lib/hierarchy/resolve-scope';

export interface DateRange {
  start: string; // ISO date string
  end: string;
}

export type ScopePreset = 'self' | 'my-team' | 'custom' | 'national';

export interface ScopeSelection {
  preset: ScopePreset;
  selectedNodeIds: string[]; // org_hierarchy UUIDs for custom
}

export interface FilterState {
  dateRange: DateRange;
  scope: ScopeSelection;
}

interface FilterContextType {
  filters: FilterState;
  setDateRange: (range: DateRange) => void;
  setScope: (scope: ScopeSelection) => void;
  resetFilters: () => void;
  /** Resolved consultant IDs for current scope. null = no filter (national). */
  resolvedConsultantIds: string[] | null;
  /** True while hierarchy/consultant data is loading */
  isScopeLoading: boolean;
  /** User's own auth ID */
  userId: string;
  /** User's hierarchy node ID */
  userHierarchyNodeId: string | null;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

// Extract local date as YYYY-MM-DD (avoids UTC shift from toISOString)
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper to calculate date range from preset
export function calculateDateRange(preset: string): DateRange {
  const end = new Date();
  const start = new Date();

  switch (preset) {
    case 'wtd': {
      // Week-to-date: Monday of the current week through today
      const dow = start.getDay(); // 0=Sun, 1=Mon, ...
      const daysSinceMonday = dow === 0 ? 6 : dow - 1;
      start.setDate(start.getDate() - daysSinceMonday);
      break;
    }
    case 'last_week': {
      // Last working week: Monday–Friday of the previous week
      const dow2 = end.getDay();
      const daysSinceMon = dow2 === 0 ? 6 : dow2 - 1;
      // Monday of current week, then back 7 to get last Monday
      start.setDate(start.getDate() - daysSinceMon - 7);
      // End = that Friday (start + 4 days)
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 4);
      break;
    }
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
    start: toLocalDateString(start),
    end: toLocalDateString(end),
  };
}

// Default filter state
const DEFAULT_SCOPE: ScopeSelection = { preset: 'self', selectedNodeIds: [] };

const DEFAULT_FILTERS: FilterState = {
  dateRange: calculateDateRange('30d'),
  scope: DEFAULT_SCOPE,
};

interface FilterProviderProps {
  children: ReactNode;
  userId: string;
  userHierarchyNodeId: string | null;
}

export function FilterProvider({
  children,
  userId,
  userHierarchyNodeId,
}: FilterProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Hierarchy data for scope resolution
  const { data: tree = [], isLoading: treeLoading } = useHierarchyTree();
  const { data: consultants = [], isLoading: consultantsLoading } = useConsultantMap();

  // Initialize from URL params if available
  const [filters, setFilters] = useState<FilterState>(() => {
    const urlDateStart = searchParams.get('dateStart');
    const urlDateEnd = searchParams.get('dateEnd');
    const urlScope = searchParams.get('scope') as ScopePreset | null;
    const urlNodes = searchParams.get('nodes');

    const validPresets: ScopePreset[] = ['self', 'my-team', 'custom', 'national'];
    const preset = validPresets.includes(urlScope as ScopePreset)
      ? (urlScope as ScopePreset)
      : DEFAULT_SCOPE.preset;

    const selectedNodeIds =
      preset === 'custom' && urlNodes
        ? urlNodes.split(',').filter(Boolean)
        : [];

    return {
      dateRange:
        urlDateStart && urlDateEnd
          ? { start: urlDateStart, end: urlDateEnd }
          : DEFAULT_FILTERS.dateRange,
      scope: { preset, selectedNodeIds },
    };
  });

  // Sync URL params whenever filters change
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    params.set('dateStart', filters.dateRange.start);
    params.set('dateEnd', filters.dateRange.end);
    params.set('scope', filters.scope.preset);

    if (filters.scope.preset === 'custom' && filters.scope.selectedNodeIds.length > 0) {
      params.set('nodes', filters.scope.selectedNodeIds.join(','));
    } else {
      params.delete('nodes');
    }

    // Remove legacy params
    params.delete('consultantId');

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [filters, pathname, router, searchParams]);

  // Resolve scope to consultant IDs
  const resolvedConsultantIds = useMemo<string[] | null>(() => {
    if (treeLoading || consultantsLoading) return null;

    const { preset, selectedNodeIds } = filters.scope;

    switch (preset) {
      case 'self':
        return [userId];

      case 'my-team': {
        if (!userHierarchyNodeId) return [userId]; // Fallback to self if no team
        const siblingIds = getTeamSiblingIds(userHierarchyNodeId, tree);
        // For "My Team", just use the user's own team node (not sibling teams)
        const teamNodeIds = [userHierarchyNodeId];
        return resolveConsultantIds(teamNodeIds, consultants);
      }

      case 'custom': {
        if (selectedNodeIds.length === 0) return [userId]; // Fallback
        const expandedIds = expandNodeIds(selectedNodeIds, tree);
        return resolveConsultantIds(expandedIds, consultants);
      }

      case 'national':
        return null; // null = no filter

      default:
        return [userId];
    }
  }, [filters.scope, tree, consultants, treeLoading, consultantsLoading, userId, userHierarchyNodeId]);

  const isScopeLoading = treeLoading || consultantsLoading;

  const setDateRange = useCallback((range: DateRange) => {
    setFilters((prev) => ({ ...prev, dateRange: range }));
  }, []);

  const setScope = useCallback((scope: ScopeSelection) => {
    setFilters((prev) => ({ ...prev, scope }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return (
    <FilterContext.Provider
      value={{
        filters,
        setDateRange,
        setScope,
        resetFilters,
        resolvedConsultantIds,
        isScopeLoading,
        userId,
        userHierarchyNodeId,
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

// Helper hook for resolved scope
export function useResolvedScope() {
  const { resolvedConsultantIds, isScopeLoading } = useFilters();
  return { consultantIds: resolvedConsultantIds, isLoading: isScopeLoading };
}
