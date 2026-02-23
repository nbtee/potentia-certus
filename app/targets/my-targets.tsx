'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, DollarSign, Phone, Users, Briefcase, Handshake, FileCheck, Star } from 'lucide-react';
import { MonthSelector } from '@/app/admin/targets/month-selector';
import { useMyTargets } from '@/lib/targets/hooks';
import { getCurrentMonthStart, getMonthStart } from '@/lib/targets/month-utils';
import { cn } from '@/lib/utils';
import type { MyTargetValue, MonthTargets } from '@/lib/targets/types';

const TARGET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  revenue: DollarSign,
  candidate_calls: Phone,
  candidate_meetings: Users,
  bd_calls: Briefcase,
  adam_calls: Handshake,
  client_meetings: Users,
  references: FileCheck,
  strategic_referrals: Star,
};

function formatValue(value: number | null, unit: 'currency' | 'count'): string {
  if (value === null) return 'No target set';
  if (unit === 'currency') return `$${value.toLocaleString()}`;
  return value.toLocaleString();
}

function TargetCard({ target }: { target: MyTargetValue }) {
  const Icon = TARGET_ICONS[target.targetKey] ?? Star;
  const hasValue = target.value !== null;

  return (
    <Card className={cn(
      'transition-shadow hover:shadow-md',
      target.targetKey === 'revenue' && 'col-span-full sm:col-span-2'
    )}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
          hasValue ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {target.label}
          </p>
          <p className={cn(
            'mt-0.5 text-lg font-semibold tabular-nums',
            hasValue ? 'text-gray-900' : 'text-gray-400 text-sm font-normal'
          )}>
            {formatValue(target.value, target.unit)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryTable({ history }: { history: MonthTargets[] }) {
  if (history.length === 0) return null;

  // Get all unique target keys from the first month
  const targetKeys = history[0].targets;

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">
        6-Month Overview
      </h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left font-semibold text-gray-700">
                Target
              </th>
              {history.map((m) => (
                <th
                  key={m.monthStart}
                  className={cn(
                    'px-3 py-2 text-right font-semibold text-gray-700 min-w-[90px]',
                    m.monthStart === history[history.length - 1].monthStart &&
                      'bg-emerald-50'
                  )}
                >
                  {m.monthLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {targetKeys.map((tk) => (
              <tr key={tk.targetKey} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-800">
                  {tk.label}
                </td>
                {history.map((m) => {
                  const t = m.targets.find(
                    (v) => v.targetKey === tk.targetKey
                  );
                  const isCurrent =
                    m.monthStart ===
                    history[history.length - 1].monthStart;
                  return (
                    <td
                      key={m.monthStart}
                      className={cn(
                        'px-3 py-2 text-right tabular-nums',
                        isCurrent && 'bg-emerald-50 font-medium',
                        t?.value === null && 'text-gray-300'
                      )}
                    >
                      {t ? formatValue(t.value, t.unit) : '—'}
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

export function MyTargets() {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthStart);
  const monthStart = getMonthStart(currentMonth);
  const { data, isLoading } = useMyTargets(monthStart);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Targets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your monthly revenue and activity targets.
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
          {/* Target cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.current.targets.map((t) => (
              <TargetCard key={t.targetKey} target={t} />
            ))}
          </div>

          {/* History table */}
          <HistoryTable history={data.history} />
        </>
      ) : (
        <div className="py-20 text-center text-sm text-gray-500">
          Failed to load targets.
        </div>
      )}
    </div>
  );
}
