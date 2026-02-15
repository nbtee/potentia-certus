/**
 * KPI Card Widget
 *
 * Displays a single metric value with optional comparison and icon.
 * Fetches data from a data asset using the useWidgetData hook.
 */

'use client';

import { useWidgetData } from '@/lib/data/use-widget-data';
import { isSingleValue } from '@/lib/data/shape-contracts';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus, type LucideIcon } from 'lucide-react';

export interface KPICardProps {
  assetKey: string;
  icon: LucideIcon;
  colorScheme?: 'blue' | 'green' | 'purple' | 'orange';
  dateRange?: {
    start: string;
    end: string;
  };
  consultantId?: string;
}

const colorSchemes = {
  blue: {
    gradient: 'from-blue-500/10 to-blue-600/5',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600',
    border: 'border-blue-200',
  },
  green: {
    gradient: 'from-green-500/10 to-green-600/5',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-600',
    border: 'border-green-200',
  },
  purple: {
    gradient: 'from-purple-500/10 to-purple-600/5',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-600',
    border: 'border-purple-200',
  },
  orange: {
    gradient: 'from-orange-500/10 to-orange-600/5',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-600',
    border: 'border-orange-200',
  },
};

export function KPICard({
  assetKey,
  icon: Icon,
  colorScheme = 'blue',
  dateRange,
  consultantId,
}: KPICardProps) {
  const { data, isLoading, error } = useWidgetData({
    assetKey,
    shape: 'single_value',
    filters: {
      dateRange,
      consultantId,
    },
  });

  const colors = colorSchemes[colorScheme];

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-600">Error loading data</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-10 w-10 rounded-lg bg-gray-200" />
          <div className="h-8 w-24 rounded bg-gray-200" />
          <div className="h-4 w-32 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!data || !isSingleValue(data.data)) {
    return null;
  }

  const metric = data.data;
  const formattedValue = formatValue(metric.value, metric.format);

  const ComparisonIcon =
    metric.comparison?.direction === 'up'
      ? ArrowUp
      : metric.comparison?.direction === 'down'
        ? ArrowDown
        : Minus;

  const comparisonColor =
    metric.comparison?.direction === 'up'
      ? 'text-green-600 bg-green-50'
      : metric.comparison?.direction === 'down'
        ? 'text-red-600 bg-red-50'
        : 'text-gray-600 bg-gray-50';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-xl border ${colors.border} bg-gradient-to-br ${colors.gradient} p-6 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md`}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg ${colors.iconBg}`}
      >
        <Icon className={`h-6 w-6 ${colors.iconColor}`} />
      </motion.div>

      {/* Value */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-2"
      >
        <div className="text-3xl font-bold text-gray-900">{formattedValue}</div>
      </motion.div>

      {/* Label */}
      <div className="mb-3 text-sm font-medium text-gray-600">
        {metric.label}
      </div>

      {/* Comparison */}
      {metric.comparison && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${comparisonColor}`}
        >
          <ComparisonIcon className="h-3 w-3" />
          <span>
            {(metric.comparison.value * 100).toFixed(1)}%{' '}
            {metric.comparison.label}
          </span>
        </motion.div>
      )}

      {/* Shine effect on hover */}
      <motion.div
        className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full bg-white opacity-0"
        whileHover={{ opacity: 0.1, scale: 1.5 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatValue(
  value: number,
  format?: 'number' | 'currency' | 'percentage' | 'duration'
): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-NZ', {
        style: 'currency',
        currency: 'NZD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'duration':
      // Format as hours if > 60 minutes
      if (value >= 60) {
        const hours = Math.floor(value / 60);
        const minutes = value % 60;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      }
      return `${value}m`;
    case 'number':
    default:
      return new Intl.NumberFormat('en-NZ').format(value);
  }
}
