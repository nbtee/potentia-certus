'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Loader2,
  DollarSign,
  Phone,
  Users,
  Briefcase,
  Handshake,
  Star,
  Percent,
  CalendarCheck,
  Clock,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthSelector } from '@/app/admin/targets/month-selector';
import { useMyPerformance } from '@/lib/targets/hooks';
import { getCurrentMonthStart, getMonthStart } from '@/lib/targets/month-utils';
import { cn } from '@/lib/utils';
import type { CategoryPerformance, MonthPerformance, TimeWindow } from '@/lib/targets/types';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  revenue: DollarSign,
  candidate_calls: Phone,
  candidate_meetings: Users,
  bd_calls: Briefcase,
  adam_calls: Handshake,
  client_meetings: Users,
  strategic_referrals: Star,
  first_interviews: CalendarCheck,
  sub_to_interview_rate: Percent,
  interview_to_placement_rate: Percent,
  avg_time_to_submittal: Clock,
};

function formatActual(value: number, unit: 'currency' | 'count', format?: 'percentage' | 'days'): string {
  if (format === 'percentage') return `${value.toFixed(1)}%`;
  if (format === 'days') return `${value.toFixed(1)} days`;
  if (unit === 'currency') {
    return value >= 1000
      ? `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
      : `$${Math.round(value).toLocaleString()}`;
  }
  return value.toLocaleString();
}

function formatTarget(value: number | null, unit: 'currency' | 'count'): string {
  if (value === null) return 'No target';
  if (unit === 'currency') {
    return value >= 1000
      ? `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
      : `$${Math.round(value).toLocaleString()}`;
  }
  return value.toLocaleString();
}

type StatusColor = 'green' | 'amber' | 'red' | 'gray';

function getStatusColor(percentage: number | null): StatusColor {
  if (percentage === null) return 'gray';
  if (percentage >= 100) return 'green';
  if (percentage >= 70) return 'amber';
  return 'red';
}

const STATUS_STYLES: Record<StatusColor, { icon: string; bar: string; text: string; bg: string }> = {
  green: {
    icon: 'bg-emerald-100 text-emerald-600',
    bar: 'bg-emerald-500',
    text: 'text-emerald-600',
    bg: 'ring-emerald-200',
  },
  amber: {
    icon: 'bg-amber-100 text-amber-600',
    bar: 'bg-amber-500',
    text: 'text-amber-600',
    bg: 'ring-amber-200',
  },
  red: {
    icon: 'bg-red-100 text-red-600',
    bar: 'bg-red-500',
    text: 'text-red-600',
    bg: 'ring-red-200',
  },
  gray: {
    icon: 'bg-gray-100 text-gray-400',
    bar: 'bg-gray-300',
    text: 'text-gray-400',
    bg: 'ring-gray-200',
  },
};

function PerformanceCard({ cat }: { cat: CategoryPerformance }) {
  const Icon = CATEGORY_ICONS[cat.targetKey] ?? Star;
  const isDerivedMetric = cat.format === 'percentage' || cat.format === 'days';
  const color = isDerivedMetric ? 'gray' as StatusColor : getStatusColor(cat.percentage);
  const styles = STATUS_STYLES[color];
  const barWidth = cat.percentage !== null ? Math.min(cat.percentage, 100) : 0;

  return (
    <Card
      className={cn(
        'transition-shadow hover:shadow-md',
        cat.targetKey === 'revenue' && 'col-span-full sm:col-span-2'
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
              styles.icon
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {cat.label}
            </p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-lg font-semibold tabular-nums text-gray-900">
                {formatActual(cat.actual, cat.unit, cat.format)}
              </span>
              {isDerivedMetric && cat.metadata ? (
                cat.format === 'days' ? (
                  <span className="text-xs text-gray-400">
                    across {cat.metadata.jobCount} job{cat.metadata.jobCount !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">
                    {cat.metadata.numerator} of {cat.metadata.denominator}
                  </span>
                )
              ) : (
                <span className="text-xs text-gray-400">
                  / {formatTarget(cat.target, cat.unit)}
                </span>
              )}
            </div>
          </div>
          {!isDerivedMetric && cat.percentage !== null && (
            <span className={cn('text-sm font-semibold tabular-nums', styles.text)}>
              {cat.percentage}%
            </span>
          )}
        </div>

        {/* Progress bar — hidden for derived metrics (no target) */}
        {!isDerivedMetric && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn('h-full rounded-full transition-all duration-500', styles.bar)}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PerformanceHistoryTable({
  history,
  timeWindow,
  onTimeWindowChange,
}: {
  history: MonthPerformance[];
  timeWindow: TimeWindow;
  onTimeWindowChange: (tw: TimeWindow) => void;
}) {
  if (history.length === 0) return null;

  const categories = history[0].categories;
  const currentMonthStart = history[history.length - 1].monthStart;

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          {timeWindow === 'ytd' ? 'Year-to-Date' : '6-Month Overview'}
        </h2>
        <Tabs value={timeWindow} onValueChange={(v) => onTimeWindowChange(v as TimeWindow)}>
          <TabsList className="h-8">
            <TabsTrigger value="6-month" className="text-xs px-3 py-1">6-Month</TabsTrigger>
            <TabsTrigger value="ytd" className="text-xs px-3 py-1">Year-to-Date</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left font-semibold text-gray-700">
                Category
              </th>
              {history.map((m) => (
                <th
                  key={m.monthStart}
                  className={cn(
                    'px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]',
                    m.monthStart === currentMonthStart && 'bg-emerald-50'
                  )}
                >
                  {m.monthLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.targetKey} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-800">
                  {cat.label}
                </td>
                {history.map((m) => {
                  const c = m.categories.find(
                    (v) => v.targetKey === cat.targetKey
                  );
                  if (!c) return <td key={m.monthStart} className="px-3 py-2 text-right">—</td>;

                  const isCurrent = m.monthStart === currentMonthStart;
                  const color = getStatusColor(c.percentage);
                  const cellColor =
                    color === 'green'
                      ? 'text-emerald-600'
                      : color === 'amber'
                        ? 'text-amber-600'
                        : color === 'red'
                          ? 'text-red-600'
                          : 'text-gray-400';

                  return (
                    <td
                      key={m.monthStart}
                      className={cn(
                        'px-3 py-2 text-right tabular-nums',
                        isCurrent && 'bg-emerald-50'
                      )}
                    >
                      <span className={cn('font-medium', cellColor)}>
                        {formatCellValue(c.actual, c.unit, c.format)}
                      </span>
                      {c.format === 'days' && c.metadata ? (
                        <span className="text-gray-400">
                          {' '}({c.metadata.jobCount}jobs)
                        </span>
                      ) : c.format === 'percentage' && c.metadata ? (
                        <span className="text-gray-400">
                          {' '}({c.metadata.numerator}/{c.metadata.denominator})
                        </span>
                      ) : c.target !== null ? (
                        <span className="text-gray-400">
                          {' / '}
                          {formatCellValue(c.target, c.unit)}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCellValue(value: number, unit: 'currency' | 'count', format?: 'percentage' | 'days'): string {
  if (format === 'percentage') return `${value.toFixed(1)}%`;
  if (format === 'days') return `${value.toFixed(1)}d`;
  if (unit === 'currency') {
    return `$${Math.round(value).toLocaleString()}`;
  }
  return value.toLocaleString();
}

export function MyPerformance() {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthStart);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('6-month');
  const monthStart = getMonthStart(currentMonth);
  const { data, isLoading } = useMyPerformance(monthStart, timeWindow);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Performance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your actual results vs monthly targets.
          </p>
        </div>
        <MonthSelector
          currentMonth={currentMonth}
          onChange={setCurrentMonth}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : data ? (
        <>
          {/* Performance cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.current.categories.map((cat) => (
              <PerformanceCard key={cat.targetKey} cat={cat} />
            ))}
          </div>

          {/* History table */}
          <PerformanceHistoryTable
            history={data.history}
            timeWindow={timeWindow}
            onTimeWindowChange={setTimeWindow}
          />
        </>
      ) : (
        <div className="py-20 text-center text-sm text-gray-500">
          Failed to load performance data.
        </div>
      )}
    </div>
  );
}
