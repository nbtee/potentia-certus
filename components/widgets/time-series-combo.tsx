'use client';

import { useWidgetData } from '@/lib/data/use-widget-data';
import { isTimeSeries } from '@/lib/data/shape-contracts';
import { formatValue } from '@/lib/utils/format';
import type { DateRange } from '@/lib/contexts/filter-context';
import { motion } from 'framer-motion';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TimeSeriesComboProps {
  assetKey: string;
  title: string;
  dateRange?: DateRange;
  consultantId?: string;
  barColor?: string;
  lineColor?: string;
  movingAverageDays?: number;
  height?: number;
}

function computeMovingAverage(
  data: Array<{ date: string; value: number }>,
  windowSize: number
): Array<{ date: string; value: number; movingAvg: number | null }> {
  return data.map((point, index) => {
    if (index < windowSize - 1) {
      return { ...point, movingAvg: null as number | null };
    }
    const window = data.slice(index - windowSize + 1, index + 1);
    const avg = window.reduce((sum, p) => sum + p.value, 0) / windowSize;
    return { ...point, movingAvg: Math.round(avg * 10) / 10 };
  });
}

export function TimeSeriesCombo({
  assetKey,
  title,
  dateRange,
  consultantId,
  barColor = '#00E5C0',
  lineColor = '#ef4444',
  movingAverageDays = 7,
  height = 300,
}: TimeSeriesComboProps) {
  const { data, isLoading, error } = useWidgetData({
    assetKey,
    shape: 'time_series',
    filters: { dateRange, consultantId },
  });

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

  if (!data || !isTimeSeries(data.data)) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  const timeSeriesData = data.data;
  const series = timeSeriesData.series[0];
  if (!series || series.data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-gray-500">No data for selected period</p>
        </div>
      </motion.div>
    );
  }

  const chartData = computeMovingAverage(series.data, movingAverageDays).map(
    (point) => ({
      ...point,
      dateLabel: format(parseISO(point.date), 'MMM dd'),
    })
  );

  const total = series.data.reduce((sum, p) => sum + p.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            Total: {formatValue(total, timeSeriesData.format)} | {movingAverageDays}-day
            moving average overlay
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            formatter={(value: number, name: string) => [
              formatValue(value, timeSeriesData.format),
              name === 'movingAvg' ? `${movingAverageDays}d avg` : 'Daily',
            ]}
            labelStyle={{ fontWeight: 600, color: '#111827' }}
          />
          <Legend
            formatter={(value) =>
              value === 'movingAvg' ? `${movingAverageDays}-day avg` : 'Daily'
            }
          />
          <Bar
            dataKey="value"
            fill={barColor}
            opacity={0.7}
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          />
          <Line
            type="monotone"
            dataKey="movingAvg"
            stroke={lineColor}
            strokeWidth={2.5}
            dot={false}
            animationDuration={1000}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
