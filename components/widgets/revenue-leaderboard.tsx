'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useResolvedScope } from '@/lib/contexts/filter-context';
import { formatValue } from '@/lib/utils/format';
import type { DateRange } from '@/lib/contexts/filter-context';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Trophy, Medal, Award, ChevronDown } from 'lucide-react';
import { WidgetInfoButton } from './widget-info-button';

// ============================================================================
// Types
// ============================================================================

interface PlacementDetail {
  id: string;
  placementDate: string;
  revenueType: 'permanent' | 'contract';
  revenue: number;
  jobTitle: string;
  clientName: string;
  candidateName: string;
}

interface ConsultantRevenue {
  consultantId: string;
  name: string;
  totalRevenue: number;
  placements: PlacementDetail[];
}

// ============================================================================
// Revenue Calculation
// ============================================================================

function calculatePlacementRevenue(row: Record<string, unknown>): number {
  const revenueType = row.revenue_type as string;
  if (revenueType === 'permanent') {
    return Number(row.fee_amount) || 0;
  }
  const gpPerHour = Number(row.gp_per_hour) || 0;
  const startDate = row.start_date as string | null;
  const endDate = row.end_date as string | null;
  if (!startDate || !endDate || gpPerHour === 0) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const calendarDays = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const hoursPerDay = Number(row.hours_per_day) || 8;
  const daysPerWeek = Number(row.working_days_per_week) || 0;
  const workingDays = daysPerWeek > 0 ? calendarDays * (daysPerWeek / 7) : calendarDays;
  return gpPerHour * hoursPerDay * workingDays;
}

// ============================================================================
// Date Range Helper (mirrors data-asset-queries.ts)
// ============================================================================

function nextDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

// ============================================================================
// Custom Hook
// ============================================================================

function useRevenueLeaderboard(dateRange?: DateRange, limit: number = 10) {
  const { consultantIds, isLoading: scopeLoading } = useResolvedScope();

  const sortedIds = consultantIds ? [...consultantIds].sort() : null;
  const queryKey = [
    'revenue-leaderboard',
    dateRange?.start ?? null,
    dateRange?.end ?? null,
    sortedIds,
    limit,
  ];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<ConsultantRevenue[]> => {
      const supabase = createClient();

      let query = supabase
        .from('placements')
        .select(`
          id, consultant_id, placement_date, revenue_type, fee_amount, gp_per_hour, start_date, end_date, hours_per_day, working_days_per_week,
          user_profiles(display_name, first_name, last_name),
          candidates(first_name, last_name),
          job_orders(title, client_corporations(name))
        `);

      // Date range filter on start_date (when revenue begins, not when placement was created)
      // Permanent placements without start_date fall back to placement_date
      if (dateRange) {
        query = query.or(
          `and(start_date.gte.${dateRange.start},start_date.lt.${nextDay(dateRange.end)}),and(start_date.is.null,placement_date.gte.${dateRange.start},placement_date.lt.${nextDay(dateRange.end)})`
        );
      }

      // Scope filter
      if (consultantIds !== null && consultantIds !== undefined) {
        if (consultantIds.length === 0) {
          return [];
        }
        if (consultantIds.length === 1) {
          query = query.eq('consultant_id', consultantIds[0]);
        } else {
          query = query.in('consultant_id', consultantIds);
        }
      }

      const { data: rows, error: queryError } = await query;
      if (queryError) throw new Error(`Revenue query failed: ${queryError.message}`);
      if (!rows || rows.length === 0) return [];

      // Group by consultant, calculate revenue per placement
      const consultantMap = new Map<string, ConsultantRevenue>();

      for (const row of rows as unknown as Record<string, unknown>[]) {
        const consultantId = row.consultant_id as string;
        if (!consultantId) continue;

        // Resolve consultant name
        if (!consultantMap.has(consultantId)) {
          const profile = Array.isArray(row.user_profiles)
            ? (row.user_profiles as Record<string, unknown>[])[0]
            : row.user_profiles as Record<string, unknown> | null;
          const name =
            (profile?.display_name as string) ||
            [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
            'Unknown';

          consultantMap.set(consultantId, {
            consultantId,
            name,
            totalRevenue: 0,
            placements: [],
          });
        }

        const revenue = calculatePlacementRevenue(row);
        const entry = consultantMap.get(consultantId)!;
        entry.totalRevenue += revenue;

        // Resolve candidate name
        const candidate = Array.isArray(row.candidates)
          ? (row.candidates as Record<string, unknown>[])[0]
          : row.candidates as Record<string, unknown> | null;
        const candidateName = candidate
          ? [candidate.first_name, candidate.last_name].filter(Boolean).join(' ') || 'Unknown'
          : '-';

        // Resolve job title and client name
        const job = Array.isArray(row.job_orders)
          ? (row.job_orders as Record<string, unknown>[])[0]
          : row.job_orders as Record<string, unknown> | null;
        const jobTitle = (job?.title as string) || '-';
        const clientCorp = job?.client_corporations as Record<string, unknown> | null;
        const clientName = (clientCorp?.name as string) || '-';

        entry.placements.push({
          id: row.id as string,
          placementDate: row.placement_date as string,
          revenueType: row.revenue_type as 'permanent' | 'contract',
          revenue,
          jobTitle,
          clientName,
          candidateName,
        });
      }

      // Sort placements within each consultant by revenue desc
      for (const entry of consultantMap.values()) {
        entry.placements.sort((a, b) => b.revenue - a.revenue);
      }

      // Sort consultants by total revenue desc, take top N
      return Array.from(consultantMap.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit);
    },
    enabled: !scopeLoading,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  return { consultants: data ?? [], isLoading: isLoading || scopeLoading, error };
}

// ============================================================================
// Rank Icons (same as AnimatedLeaderboard)
// ============================================================================

const rankIcons = [
  { Icon: Trophy, color: 'text-[#FDEA00]', bg: 'bg-[#FDEA00]/10' },
  { Icon: Medal, color: 'text-gray-400', bg: 'bg-gray-50' },
  { Icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
];

// ============================================================================
// Component
// ============================================================================

interface RevenueLeaderboardProps {
  title: string;
  dateRange?: DateRange;
  limit?: number;
  description?: string;
}

export function RevenueLeaderboard({
  title,
  dateRange,
  limit = 10,
  description,
}: RevenueLeaderboardProps) {
  const { consultants, isLoading, error } = useRevenueLeaderboard(dateRange, limit);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const maxRevenue = useMemo(
    () => (consultants.length > 0 ? consultants[0].totalRevenue : 1),
    [consultants]
  );

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-red-200 bg-red-50 p-6"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Failed to load data</h3>
            <p className="mt-1 text-sm text-red-700">{(error as Error).message}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (consultants.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-gray-500">No placements for selected period</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && <WidgetInfoButton description={description} />}
        </div>
        <span className="text-xs text-gray-500">
          Top {consultants.length}
        </span>
      </div>

      <div className="space-y-1">
        <AnimatePresence>
          {consultants.map((consultant, index) => {
            const rank = rankIcons[index];
            const barWidth = maxRevenue > 0 ? (consultant.totalRevenue / maxRevenue) * 100 : 0;
            const isExpanded = expandedId === consultant.consultantId;

            return (
              <motion.div
                key={consultant.consultantId}
                layoutId={consultant.consultantId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                {/* Consultant row */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : consultant.consultantId)
                  }
                  className="group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                >
                  {/* Rank */}
                  <div className="flex w-8 flex-shrink-0 items-center justify-center">
                    {rank ? (
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full ${rank.bg}`}
                      >
                        <rank.Icon className={`h-4 w-4 ${rank.color}`} />
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-gray-400">
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Name and bar */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="truncate text-sm font-medium text-gray-900">
                        {consultant.name}
                      </span>
                      <span className="ml-2 flex-shrink-0 text-sm font-semibold text-gray-700">
                        {formatValue(consultant.totalRevenue, 'currency')}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{
                          delay: index * 0.05 + 0.2,
                          duration: 0.5,
                          ease: 'easeOut',
                        }}
                        className={`h-full rounded-full ${
                          index === 0
                            ? 'bg-[#FDEA00]'
                            : index === 1
                              ? 'bg-gray-400'
                              : index === 2
                                ? 'bg-amber-500'
                                : 'bg-[#00C9A7]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expand chevron */}
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </motion.div>
                </button>

                {/* Expanded placement details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-11 mr-3 mb-2 rounded-lg border border-gray-100 bg-gray-50">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 text-left text-gray-500">
                              <th className="px-3 py-2 font-medium">Job Title</th>
                              <th className="px-3 py-2 font-medium">Client</th>
                              <th className="px-3 py-2 font-medium">Candidate</th>
                              <th className="px-3 py-2 font-medium">Type</th>
                              <th className="px-3 py-2 text-right font-medium">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {consultant.placements.map((p) => (
                              <tr
                                key={p.id}
                                className="border-b border-gray-100 last:border-0"
                              >
                                <td className="max-w-[140px] truncate px-3 py-1.5 text-gray-900">
                                  {p.jobTitle}
                                </td>
                                <td className="max-w-[120px] truncate px-3 py-1.5 text-gray-700">
                                  {p.clientName}
                                </td>
                                <td className="max-w-[120px] truncate px-3 py-1.5 text-gray-700">
                                  {p.candidateName}
                                </td>
                                <td className="px-3 py-1.5">
                                  <span
                                    className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                      p.revenueType === 'permanent'
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'bg-green-50 text-green-700'
                                    }`}
                                  >
                                    {p.revenueType === 'permanent' ? 'Perm' : 'Contract'}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 text-right font-medium text-gray-900">
                                  {formatValue(p.revenue, 'currency')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
