'use client';

import { useState, useEffect } from 'react';
import { isCategorical, type Categorical } from '@/lib/data/shape-contracts';
import { formatValue } from '@/lib/utils/format';
import { queryCategoricalMultiSeries } from '@/lib/data/data-asset-queries';
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

interface StackedBarChartProps {
  assetKey: string;
  title: string;
  dateRange?: DateRange;
  limit?: number;
  height?: number;
}

const STACK_COLORS = [
  '#00E5C0', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

export function StackedBarChart({
  assetKey,
  title,
  dateRange,
  limit = 8,
  height = 350,
}: StackedBarChartProps) {
  const [data, setData] = useState<Categorical | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    queryCategoricalMultiSeries({
      assetKey,
      shape: 'categorical',
      filters: { dateRange },
      limit,
    })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assetKey, dateRange, limit]);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <Skeleton className="mb-4 h-6 w-48" />
        <Skeleton className="h-[300px] w-full" />
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
            <p className="mt-1 text-sm text-red-700">{error.message}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!data || !isCategorical(data) || !data.series || data.series.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  // Build chart data: each row is a consultant, with a column per series (activity type)
  const seriesNames = data.series.map((s) => s.name);
  const chartData = data.categories.map((cat, catIndex) => {
    const row: Record<string, string | number> = { name: cat.label };
    for (const s of data.series!) {
      row[s.name] = s.data[catIndex]?.value ?? 0;
    }
    return row;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500">
          {seriesNames.length} activity types
        </span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            formatter={(value: number) => formatValue(value, data.format)}
            labelStyle={{ fontWeight: 600, color: '#111827' }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="rect"
            iconSize={10}
          />
          {seriesNames.map((name, index) => (
            <Bar
              key={name}
              dataKey={name}
              stackId="stack"
              fill={STACK_COLORS[index % STACK_COLORS.length]}
              radius={
                index === seriesNames.length - 1 ? [4, 4, 0, 0] : undefined
              }
              animationDuration={800}
              animationBegin={index * 100}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
