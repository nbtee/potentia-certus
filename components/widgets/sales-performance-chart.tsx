'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetch-all';
import { useResolvedScope } from '@/lib/contexts/filter-context';
import type { DateRange } from '@/lib/contexts/filter-context';
import { motion } from 'framer-motion';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { WidgetInfoButton } from './widget-info-button';

// ============================================================================
// Types & Constants
// ============================================================================

type SalesCategory =
  | 'BD Calls'
  | 'AD/AM Calls'
  | 'Client Meetings';

interface ConsultantSales {
  name: string;
  total: number;
  'BD Calls': number;
  'AD/AM Calls': number;
  'Client Meetings': number;
}

const CATEGORIES: { key: SalesCategory; color: string }[] = [
  { key: 'BD Calls', color: '#8b5cf6' },
  { key: 'AD/AM Calls', color: '#f59e0b' },
  { key: 'Client Meetings', color: '#00E5C0' },
];

const ACTIVITY_TYPE_TO_CATEGORY: Record<string, SalesCategory> = {
  'BD Call': 'BD Calls',
  'AD Call': 'AD/AM Calls',
  'AM Call': 'AD/AM Calls',
  'BD Meeting': 'Client Meetings',
  'Coffee Catch Up - Client': 'Client Meetings',
};

const ACTIVITY_TYPES = Object.keys(ACTIVITY_TYPE_TO_CATEGORY);

// ============================================================================
// Date Range Helper
// ============================================================================

function nextDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

// ============================================================================
// Custom Hook
// ============================================================================

function useSalesPerformance(dateRange?: DateRange, limit: number = 10) {
  const { consultantIds, isLoading: scopeLoading } = useResolvedScope();

  const sortedIds = consultantIds ? [...consultantIds].sort() : null;
  const queryKey = [
    'sales-performance',
    dateRange?.start ?? null,
    dateRange?.end ?? null,
    sortedIds,
    limit,
  ];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<ConsultantSales[]> => {
      const supabase = createClient();

      let query = supabase
        .from('activities')
        .select('consultant_id, activity_type, user_profiles(display_name, first_name, last_name)')
        .in('activity_type', ACTIVITY_TYPES);

      if (dateRange) {
        query = query
          .gte('activity_date', dateRange.start)
          .lt('activity_date', nextDay(dateRange.end));
      }

      if (consultantIds !== null && consultantIds !== undefined) {
        if (consultantIds.length === 0) return [];
        if (consultantIds.length === 1) {
          query = query.eq('consultant_id', consultantIds[0]);
        } else {
          query = query.in('consultant_id', consultantIds);
        }
      }

      const activitiesData = await fetchAllRows(query);

      // --- Client-side aggregation ---
      const consultantMap = new Map<string, ConsultantSales>();

      for (const row of activitiesData as Record<string, unknown>[]) {
        const consultantId = row.consultant_id as string;
        if (!consultantId) continue;
        const category = ACTIVITY_TYPE_TO_CATEGORY[row.activity_type as string];
        if (!category) continue;

        if (!consultantMap.has(consultantId)) {
          const profiles = row.user_profiles;
          const profile = Array.isArray(profiles)
            ? (profiles as Record<string, unknown>[])[0] ?? null
            : (profiles as Record<string, unknown> | null);
          const name =
            (profile?.display_name as string) ||
            [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
            'Unknown';
          consultantMap.set(consultantId, {
            name,
            total: 0,
            'BD Calls': 0,
            'AD/AM Calls': 0,
            'Client Meetings': 0,
          });
        }

        const entry = consultantMap.get(consultantId)!;
        entry[category]++;
        entry.total++;
      }

      return Array.from(consultantMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
    },
    enabled: !scopeLoading,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  return { data: data ?? [], isLoading: isLoading || scopeLoading, error };
}

// ============================================================================
// Component
// ============================================================================

interface SalesPerformanceChartProps {
  title: string;
  dateRange?: DateRange;
  limit?: number;
  height?: number;
  description?: string;
}

export function SalesPerformanceChart({
  title,
  dateRange,
  limit = 10,
  height = 400,
  description,
}: SalesPerformanceChartProps) {
  const { data, isLoading, error } = useSalesPerformance(dateRange, limit);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <Skeleton className="mb-4 h-6 w-64" />
        <Skeleton className="h-[350px] w-full" />
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
            <p className="mt-1 text-sm text-red-700">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-gray-500">No sales activities for selected period</p>
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
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && <WidgetInfoButton description={description} />}
        </div>
        <span className="text-xs text-gray-500">
          Top {data.length} consultants
        </span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 11, fill: '#374151' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            labelStyle={{ fontWeight: 600, color: '#111827' }}
            formatter={(value: number, name: string) => [value, name]}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="rect"
            iconSize={10}
          />
          {CATEGORIES.map(({ key, color }, index) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="sales"
              fill={color}
              radius={index === CATEGORIES.length - 1 ? [0, 4, 4, 0] : undefined}
              animationDuration={800}
              animationBegin={index * 100}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
