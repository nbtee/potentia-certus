'use client';

import { useQueries } from '@tanstack/react-query';
import { queryDataAsset } from '@/lib/data/data-asset-queries';
import { isTimeSeries } from '@/lib/data/shape-contracts';
import type { DateRange } from '@/lib/contexts/filter-context';
import { useResolvedScope } from '@/lib/contexts/filter-context';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export interface LineConfig {
  assetKey: string;
  label: string;
  color: string;
  yAxisId?: 'left' | 'right';
}

interface MultiLineChartProps {
  title: string;
  lines: LineConfig[];
  dateRange?: DateRange;
  dualAxis?: boolean;
  height?: number;
}

export function MultiLineChart({
  title,
  lines,
  dateRange,
  dualAxis = false,
  height = 350,
}: MultiLineChartProps) {
  const { consultantIds, isLoading: scopeLoading } = useResolvedScope();
  const sortedIds = consultantIds ? [...consultantIds].sort() : null;

  const queries = useQueries({
    queries: lines.map((line) => ({
      queryKey: [
        'widget-data',
        line.assetKey,
        'time_series',
        dateRange?.start ?? null,
        dateRange?.end ?? null,
        sortedIds,
        null,
        null,
      ],
      queryFn: () =>
        queryDataAsset({
          assetKey: line.assetKey,
          shape: 'time_series',
          filters: { dateRange, consultantIds },
        }),
      enabled: !scopeLoading,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: true,
    })),
  });

  const allLoading = queries.every((q) => q.isLoading);
  const allError = queries.every((q) => q.isError);
  const someError = queries.some((q) => q.isError) && !allError;
  const successfulQueries = queries.filter((q) => q.isSuccess);

  // Loading state
  if (allLoading || scopeLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <Skeleton className="mb-4 h-6 w-64" />
        <Skeleton className="mb-2 h-4 w-48" />
        <Skeleton style={{ height }} className="w-full" />
      </motion.div>
    );
  }

  // All errors
  if (allError) {
    const firstError = queries.find((q) => q.error)?.error;
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
              {firstError instanceof Error ? firstError.message : 'Unknown error'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Merge all dates and build chart data
  const dateValueMap = new Map<string, Record<string, number>>();
  const totals = new Map<string, number>();

  lines.forEach((line, i) => {
    const result = queries[i];
    if (!result.data || !isTimeSeries(result.data.data)) return;

    const series = result.data.data.series[0];
    if (!series) return;

    let total = 0;
    for (const point of series.data) {
      if (!dateValueMap.has(point.date)) {
        dateValueMap.set(point.date, {});
      }
      dateValueMap.get(point.date)![line.assetKey] = point.value;
      total += point.value;
    }
    totals.set(line.assetKey, total);
  });

  const sortedDates = Array.from(dateValueMap.keys()).sort();

  if (sortedDates.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center justify-center" style={{ height: 200 }}>
          <p className="text-sm text-gray-500">No data for selected period</p>
        </div>
      </motion.div>
    );
  }

  // Build one row per date with all line values
  const chartData = sortedDates.map((date) => {
    const row: Record<string, string | number> = {
      date,
      dateLabel: format(parseISO(date), 'MMM dd'),
    };
    const values = dateValueMap.get(date)!;
    for (const line of lines) {
      row[line.assetKey] = values[line.assetKey] ?? 0;
    }
    return row;
  });

  // Build label lookup for tooltip/legend
  const labelMap = new Map(lines.map((l) => [l.assetKey, l.label]));

  // Determine which axis IDs are actually used
  const hasLeft = lines.some((l) => (l.yAxisId ?? 'left') === 'left');
  const hasRight = dualAxis && lines.some((l) => l.yAxisId === 'right');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {/* Summary stats row */}
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
          {lines.map((line) => {
            const total = totals.get(line.assetKey) ?? 0;
            const failed = queries[lines.indexOf(line)]?.isError;
            return (
              <div key={line.assetKey} className="flex items-center gap-1.5 text-sm text-gray-600">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: failed ? '#d1d5db' : line.color }}
                />
                <span>{line.label}:</span>
                <span className="font-medium text-gray-900">
                  {failed ? '—' : total.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {someError && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          <span>Some metrics failed to load and are not shown.</span>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: hasRight ? 10 : 10, left: 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
          />
          {hasLeft && (
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              width={45}
            />
          )}
          {hasRight && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              width={45}
            />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            formatter={(value: number, name: string) => [
              value.toLocaleString(),
              labelMap.get(name) ?? name,
            ]}
            labelStyle={{ fontWeight: 600, color: '#111827' }}
          />
          <Legend
            formatter={(value) => labelMap.get(value) ?? value}
          />
          {lines.map((line, i) => {
            // Skip lines that failed to load
            if (queries[i]?.isError) return null;
            const axisId = dualAxis ? (line.yAxisId ?? 'left') : 'left';
            return (
              <Line
                key={line.assetKey}
                type="monotone"
                dataKey={line.assetKey}
                yAxisId={axisId}
                stroke={line.color}
                strokeWidth={2}
                dot={false}
                animationDuration={800}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
