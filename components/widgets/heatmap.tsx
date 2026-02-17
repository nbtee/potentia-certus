'use client';

import { useWidgetData } from '@/lib/data/use-widget-data';
import { isMatrix } from '@/lib/data/shape-contracts';
import type { DateRange } from '@/lib/contexts/filter-context';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

// Lazy-load the Nivo heatmap to avoid +30KB bundle hit on initial load
const HeatmapInner = dynamic(
  () => import('./heatmap-inner').then((mod) => mod.HeatmapInner),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[400px] w-full" />,
  }
);

interface HeatmapProps {
  assetKey: string;
  title: string;
  dateRange?: DateRange;
  height?: number;
}

export function Heatmap({
  assetKey,
  title,
  dateRange,
  height = 400,
}: HeatmapProps) {
  const { data, isLoading, error } = useWidgetData({
    assetKey,
    shape: 'matrix',
    filters: { dateRange },
  });

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <Skeleton className="mb-4 h-6 w-48" />
        <Skeleton className="h-[400px] w-full" />
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

  if (!data || !isMatrix(data.data)) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  const matrixData = data.data;

  if (matrixData.rows.length === 0 || matrixData.columns.length === 0) {
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
          {matrixData.rows.length} x {matrixData.columns.length}
        </span>
      </div>

      <HeatmapInner matrixData={matrixData} height={height} />
    </motion.div>
  );
}
