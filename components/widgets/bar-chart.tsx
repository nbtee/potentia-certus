'use client';

import { useWidgetData } from '@/lib/data/use-widget-data';
import { isCategorical } from '@/lib/data/shape-contracts';
import { formatValue } from '@/lib/utils/format';
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
  Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface BarChartProps {
  assetKey: string;
  title: string;
  dateRange?: DateRange;
  dimension?: string; // 'consultant', 'team', 'region', 'activity_type'
  orientation?: 'vertical' | 'horizontal';
  color?: string;
  limit?: number; // Top N items to show
  showValues?: boolean; // Show value labels on bars
  height?: number;
}

// ============================================================================
// Color Utilities
// ============================================================================

// Generate gradient colors based on index
const getBarColor = (index: number, total: number, baseColor: string) => {
  // Create gradient from baseColor to lighter version
  const opacity = 0.6 + (0.4 * (total - index)) / total;
  return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

// ============================================================================
// Component
// ============================================================================

export function BarChart({
  assetKey,
  title,
  dateRange,
  dimension = 'consultant',
  orientation = 'vertical',
  color = '#3b82f6', // blue-500
  limit = 10,
  showValues = false,
  height = 300,
}: BarChartProps) {
  const { data, isLoading, error } = useWidgetData({
    assetKey,
    shape: 'categorical',
    filters: { dateRange },
    dimensions: [dimension],
    limit,
  });

  // ============================================================================
  // Loading State
  // ============================================================================

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

  // ============================================================================
  // Error State
  // ============================================================================

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

  // ============================================================================
  // Validate Data
  // ============================================================================

  if (!data || !isCategorical(data.data)) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  const categoryData = data.data;
  const categories = categoryData.categories;

  if (categories.length === 0) {
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

  // ============================================================================
  // Prepare Chart Data
  // ============================================================================

  const chartData = categories.map((cat) => ({
    name: cat.label,
    value: cat.value,
    formattedValue: formatValue(cat.value, categoryData.format),
  }));

  // ============================================================================
  // Render Chart
  // ============================================================================

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500">
          Top {categories.length}
        </span>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        {orientation === 'vertical' ? (
          <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#6b7280' }}
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
              formatter={(value: number) => formatValue(value, categoryData.format)}
              labelStyle={{ fontWeight: 600, color: '#111827' }}
            />
            <Bar
              dataKey="value"
              radius={[8, 8, 0, 0]}
              animationDuration={800}
              animationBegin={0}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(index, chartData.length, color)}
                  cursor="pointer"
                />
              ))}
            </Bar>
          </RechartsBarChart>
        ) : (
          <RechartsBarChart
            data={chartData}
            layout="horizontal"
            margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              width={90}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
              formatter={(value: number) => formatValue(value, categoryData.format)}
              labelStyle={{ fontWeight: 600, color: '#111827' }}
            />
            <Bar
              dataKey="value"
              radius={[0, 8, 8, 0]}
              animationDuration={800}
              animationBegin={0}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(index, chartData.length, color)}
                  cursor="pointer"
                />
              ))}
            </Bar>
          </RechartsBarChart>
        )}
      </ResponsiveContainer>

      {/* Footer Stats */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
        <div className="text-sm">
          <span className="text-gray-500">Total: </span>
          <span className="font-semibold text-gray-900">
            {formatValue(
              categories.reduce((sum, cat) => sum + cat.value, 0),
              categoryData.format
            )}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Average: </span>
          <span className="font-semibold text-gray-900">
            {formatValue(
              categories.reduce((sum, cat) => sum + cat.value, 0) /
                categories.length,
              categoryData.format
            )}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
