'use client';

import { useWidgetData } from '@/lib/data/use-widget-data';
import { isSingleValue } from '@/lib/data/shape-contracts';
import { formatValue } from '@/lib/utils/format';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { WidgetInfoButton } from './widget-info-button';

interface ConversionIndicatorProps {
  assetKey?: string;
  title: string;
  fromLabel?: string;
  toLabel?: string;
  /** Direct value mode: pass percentage directly (0-1 scale) */
  value?: number;
  /** Direct value mode: previous period value for comparison */
  previousValue?: number;
  dateRange?: { start: string; end: string };
  colorScheme?: 'aqua' | 'ocean' | 'violet' | 'rose';
  description?: string;
}

const colorSchemes = {
  aqua: {
    bg: 'bg-[#00C9A7]/5',
    border: 'border-[#00C9A7]/25',
    accent: 'text-[#00A88A]',
    ring: 'ring-[#00C9A7]/20',
  },
  ocean: {
    bg: 'bg-[#3B9EB5]/5',
    border: 'border-[#3B9EB5]/25',
    accent: 'text-[#2E7D8F]',
    ring: 'ring-[#3B9EB5]/20',
  },
  violet: {
    bg: 'bg-[#8566A8]/5',
    border: 'border-[#8566A8]/25',
    accent: 'text-[#6B4F8A]',
    ring: 'ring-[#8566A8]/20',
  },
  rose: {
    bg: 'bg-[#C75591]/5',
    border: 'border-[#C75591]/25',
    accent: 'text-[#A84479]',
    ring: 'ring-[#C75591]/20',
  },
};

export function ConversionIndicator({
  assetKey,
  title,
  fromLabel = 'From',
  toLabel = 'To',
  value: directValue,
  previousValue,
  dateRange,
  colorScheme = 'aqua',
  description,
}: ConversionIndicatorProps) {
  const { data, isLoading, error } = useWidgetData({
    assetKey: assetKey || '__noop__',
    shape: 'single_value',
    filters: { dateRange },
    enabled: !!assetKey && directValue === undefined,
  });

  const colors = colorSchemes[colorScheme];

  if (isLoading && !directValue) {
    return (
      <div className={`rounded-xl border ${colors.border} ${colors.bg} p-5`}>
        <Skeleton className="mb-3 h-4 w-32" />
        <Skeleton className="h-8 w-20" />
      </div>
    );
  }

  if (error && !directValue) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm text-red-600">Error loading data</p>
      </div>
    );
  }

  // Resolve the value — either from direct prop or from fetched data
  let displayValue: number;
  let comparisonDirection: 'up' | 'down' | 'neutral' | undefined;
  let comparisonLabel: string | undefined;

  if (directValue !== undefined) {
    displayValue = directValue;
    if (previousValue !== undefined && previousValue > 0) {
      const change = (directValue - previousValue) / previousValue;
      comparisonDirection = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
      comparisonLabel = `${(Math.abs(change) * 100).toFixed(1)}% vs prev`;
    }
  } else if (data && isSingleValue(data.data)) {
    displayValue = data.data.value;
    if (data.data.comparison) {
      comparisonDirection = data.data.comparison.direction;
      comparisonLabel = `${(data.data.comparison.value * 100).toFixed(1)}% ${data.data.comparison.label}`;
    }
  } else {
    return null;
  }

  const formattedValue =
    displayValue <= 1
      ? `${(displayValue * 100).toFixed(1)}%`
      : formatValue(displayValue, 'number');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl border ${colors.border} ${colors.bg} p-5 shadow-sm transition-shadow hover:shadow-md`}
    >
      <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-gray-600">
        {title}
        {description && <WidgetInfoButton description={description} />}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">{fromLabel}</span>
        <ArrowRight className="h-4 w-4 text-gray-400" />
        <span className="text-xs text-gray-500">{toLabel}</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-2"
      >
        <span className={`text-3xl font-bold ${colors.accent}`}>
          {formattedValue}
        </span>
      </motion.div>

      {comparisonDirection && comparisonLabel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-2 flex items-center gap-1 text-xs"
        >
          {comparisonDirection === 'up' ? (
            <TrendingUp className="h-3 w-3 text-green-600" />
          ) : comparisonDirection === 'down' ? (
            <TrendingDown className="h-3 w-3 text-red-600" />
          ) : null}
          <span
            className={
              comparisonDirection === 'up'
                ? 'text-green-600'
                : comparisonDirection === 'down'
                  ? 'text-red-600'
                  : 'text-gray-500'
            }
          >
            {comparisonLabel}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
