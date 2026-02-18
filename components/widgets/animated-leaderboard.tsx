'use client';

import { useWidgetData } from '@/lib/data/use-widget-data';
import { isCategorical } from '@/lib/data/shape-contracts';
import { formatValue } from '@/lib/utils/format';
import type { DateRange } from '@/lib/contexts/filter-context';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Trophy, Medal, Award } from 'lucide-react';

interface AnimatedLeaderboardProps {
  assetKey: string;
  title: string;
  dateRange?: DateRange;
  dimension?: string;
  limit?: number;
}

const rankIcons = [
  { Icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { Icon: Medal, color: 'text-gray-400', bg: 'bg-gray-50' },
  { Icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
];

export function AnimatedLeaderboard({
  assetKey,
  title,
  dateRange,
  dimension = 'consultant',
  limit = 10,
}: AnimatedLeaderboardProps) {
  const { data, isLoading, error } = useWidgetData({
    assetKey,
    shape: 'categorical',
    filters: { dateRange },
    dimensions: [dimension],
    limit,
  });

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
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

  if (!data || !isCategorical(data.data)) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  const categoryData = data.data;
  const categories = categoryData.categories;
  const maxValue = categories.length > 0 ? categories[0].value : 1;

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500">
          Top {categories.length}
        </span>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {categories.map((cat, index) => {
            const rank = rankIcons[index];
            const barWidth = (cat.value / maxValue) * 100;

            return (
              <motion.div
                key={cat.label}
                layoutId={cat.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
              >
                {/* Rank */}
                <div className="flex w-8 flex-shrink-0 items-center justify-center">
                  {rank ? (
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${rank.bg}`}
                    >
                      <rank.Icon className={`h-4 w-4 ${rank.color}`} />
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-gray-400">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Name and bar */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="truncate text-sm font-medium text-gray-900">
                      {cat.label}
                    </span>
                    <span className="ml-2 flex-shrink-0 text-sm font-semibold text-gray-700">
                      {formatValue(cat.value, categoryData.format)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{
                        delay: index * 0.05 + 0.2,
                        duration: 0.5,
                        ease: 'easeOut',
                      }}
                      className={`h-full rounded-full ${
                        index === 0
                          ? 'bg-yellow-400'
                          : index === 1
                            ? 'bg-gray-400'
                            : index === 2
                              ? 'bg-amber-500'
                              : 'bg-teal-400'
                      }`}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
