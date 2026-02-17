'use client';

import { useWidgetData } from '@/lib/data/use-widget-data';
import { isSingleValue } from '@/lib/data/shape-contracts';
import { formatValue } from '@/lib/utils/format';
import { motion } from 'framer-motion';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface TargetGaugeProps {
  assetKey: string;
  title: string;
  targetValue: number;
  targetLabel?: string;
  dateRange?: { start: string; end: string };
  consultantId?: string;
}

function getGaugeColor(percentage: number): string {
  if (percentage >= 100) return '#10b981'; // green
  if (percentage >= 75) return '#3b82f6'; // blue
  if (percentage >= 50) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

function getStatusLabel(percentage: number): string {
  if (percentage >= 100) return 'Target met!';
  if (percentage >= 75) return 'On track';
  if (percentage >= 50) return 'Needs attention';
  return 'Behind target';
}

export function TargetGauge({
  assetKey,
  title,
  targetValue,
  targetLabel = 'Target',
  dateRange,
  consultantId,
}: TargetGaugeProps) {
  const { data, isLoading, error } = useWidgetData({
    assetKey,
    shape: 'single_value',
    filters: { dateRange, consultantId },
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <Skeleton className="mb-3 h-5 w-32" />
        <Skeleton className="mx-auto h-[160px] w-[160px] rounded-full" />
        <Skeleton className="mx-auto mt-3 h-4 w-24" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-600">Error loading gauge data</p>
      </div>
    );
  }

  if (!data || !isSingleValue(data.data)) {
    return null;
  }

  const metric = data.data;
  const actual = metric.value;
  const percentage = Math.min((actual / targetValue) * 100, 120); // cap at 120%
  const gaugeColor = getGaugeColor(percentage);
  const statusLabel = getStatusLabel(percentage);

  const chartData = [
    {
      name: 'progress',
      value: percentage,
      fill: gaugeColor,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <h3 className="mb-2 text-center text-sm font-medium text-gray-600">
        {title}
      </h3>

      <div className="relative mx-auto" style={{ width: 180, height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="100%"
            innerRadius="70%"
            outerRadius="100%"
            startAngle={180}
            endAngle={0}
            data={chartData}
            barSize={16}
          >
            <RadialBar
              background={{ fill: '#f3f4f6' }}
              dataKey="value"
              cornerRadius={8}
              animationDuration={1000}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center value */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute inset-0 flex flex-col items-center justify-end pb-2"
        >
          <span className="text-2xl font-bold text-gray-900">
            {formatValue(actual, metric.format)}
          </span>
        </motion.div>
      </div>

      <div className="mt-2 text-center">
        <span
          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `${gaugeColor}15`,
            color: gaugeColor,
          }}
        >
          {statusLabel} — {percentage.toFixed(0)}%
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>0</span>
        <span>
          {targetLabel}: {formatValue(targetValue, metric.format)}
        </span>
      </div>
    </motion.div>
  );
}
