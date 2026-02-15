/**
 * Time Series Chart Widget
 *
 * Displays trend data over time using a line or area chart.
 * Fetches data from a data asset using the useWidgetData hook.
 */

'use client';

import { useWidgetData } from '@/lib/data/use-widget-data';
import { isTimeSeries } from '@/lib/data/shape-contracts';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

export interface TimeSeriesChartProps {
  assetKey: string;
  title: string;
  chartType?: 'line' | 'area';
  color?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  consultantId?: string;
  height?: number;
}

export function TimeSeriesChart({
  assetKey,
  title,
  chartType = 'area',
  color = '#3b82f6',
  dateRange,
  consultantId,
  height = 300,
}: TimeSeriesChartProps) {
  const { data, isLoading, error } = useWidgetData({
    assetKey,
    shape: 'time_series',
    filters: {
      dateRange,
      consultantId,
    },
  });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-red-600">Error loading chart data</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-full rounded bg-gray-200" />
          <div className="h-8 w-full rounded bg-gray-200" />
          <div className="h-8 w-full rounded bg-gray-200" />
          <div className="h-8 w-full rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!data || !isTimeSeries(data.data)) {
    return null;
  }

  const timeSeriesData = data.data;
  const series = timeSeriesData.series[0];

  // Format data for Recharts
  const chartData = series.data.map((point) => ({
    date: point.date,
    dateLabel: format(parseISO(point.date), 'MMM dd'),
    value: point.value,
  }));

  // Calculate total and average
  const total = chartData.reduce((sum, point) => sum + point.value, 0);
  const average = total / chartData.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Total:</span>{' '}
              <span className="text-gray-900">{total.toLocaleString()}</span>
            </div>
            <div>
              <span className="font-medium">Avg/day:</span>{' '}
              <span className="text-gray-900">{average.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        {chartType === 'area' ? (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${assetKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="dateLabel"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis stroke="#6b7280" fontSize={12} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '0.5rem',
              }}
              labelStyle={{ color: '#374151', fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${assetKey})`}
              animationDuration={1000}
            />
          </AreaChart>
        ) : (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="dateLabel"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis stroke="#6b7280" fontSize={12} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '0.5rem',
              }}
              labelStyle={{ color: '#374151', fontWeight: 600 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 3 }}
              activeDot={{ r: 5 }}
              animationDuration={1000}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </motion.div>
  );
}
