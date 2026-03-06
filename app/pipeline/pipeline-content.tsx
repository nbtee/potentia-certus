'use client';

import { useState, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MonthSelector } from '@/app/admin/targets/month-selector';
import { ScopePicker } from '@/components/scope-picker';
import { useResolvedScope } from '@/lib/contexts/filter-context';
import { usePipelineData } from '@/lib/pipeline/hooks';
import { getCurrentMonthStart, getMonthStart } from '@/lib/targets/month-utils';
import { PipelineTable } from './pipeline-table';
import { BulletChartView } from './bullet-chart-view';
import { PipelineDrillDownProvider } from '@/lib/pipeline/drill-down-context';
import { PipelineDrillDownSheet } from './pipeline-drill-down-sheet';
import { ConsultantJobsSheet } from './consultant-jobs-sheet';
import type { TeamType, PipelineRow } from '@/lib/pipeline/types';

interface PipelineContentProps {
  initialConsultantIds: string[] | null;
}

export function PipelineContent({ initialConsultantIds }: PipelineContentProps) {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthStart);
  const [activeTab, setActiveTab] = useState<'permanent' | 'contract'>('permanent');
  const { consultantIds: clientConsultantIds, isLoading: scopeLoading } = useResolvedScope();

  // Use server-resolved scope immediately; switch to client-resolved when ready
  const consultantIds = scopeLoading ? initialConsultantIds : clientConsultantIds;

  const monthStart = getMonthStart(currentMonth);
  const { data, isLoading, error } = usePipelineData(monthStart, consultantIds);

  const loading = isLoading;

  // Filter rows by team type for active tab
  const filteredRows = useMemo(() => {
    if (!data) return [];
    return data.rows.filter((r) => r.teamType === activeTab);
  }, [data, activeTab]);

  const teamType: TeamType = activeTab;

  return (
    <PipelineDrillDownProvider>
      <div className="space-y-6">
        {/* Header bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pipeline Forecast</h1>
            <p className="mt-1 text-sm text-gray-500">
              Revenue forecast based on weighted pipeline probabilities
            </p>
          </div>
          <div className="flex items-center gap-3">
            <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />
            <ScopePicker />
          </div>
        </div>

        {/* Primary tabs: Permanent / Contract */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'permanent' | 'contract')}>
          <TabsList>
            <TabsTrigger value="permanent">Permanent</TabsTrigger>
            <TabsTrigger value="contract">Contract</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Summary cards — averages + job counts */}
        {data && filteredRows.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {activeTab === 'permanent' ? (
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm">
                <span className="text-gray-500">Avg perm fee: </span>
                <span className="font-semibold text-gray-900">
                  {formatCompact(data.averages.avgPermFee)}
                </span>
                <span className="ml-1 text-xs text-gray-400">
                  ({data.averages.permCount} placements)
                </span>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm">
                <span className="text-gray-500">Avg GP/hr margin: </span>
                <span className="font-semibold text-gray-900">
                  ${data.averages.avgGpPerHourRate.toFixed(2)}/hr
                </span>
                <span className="ml-1 text-xs text-gray-400">
                  ({data.averages.contractCount} placements)
                </span>
              </div>
            )}
            <JobCountSummary rows={filteredRows} />
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Failed to load pipeline data</h3>
                <p className="mt-1 text-sm text-red-700">{(error as Error).message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {data && !loading && (
          <Tabs defaultValue="table">
            <TabsList>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="bullets">Bullet Charts</TabsTrigger>
            </TabsList>
            <TabsContent value="table">
              <PipelineTable
                rows={filteredRows}
                stages={data.stages}
                teamType={teamType}
                monthStart={monthStart}
              />
            </TabsContent>
            <TabsContent value="bullets">
              <BulletChartView rows={filteredRows} teamType={teamType} />
            </TabsContent>
          </Tabs>
        )}

        {/* Empty state */}
        {data && !loading && filteredRows.length === 0 && (
          <div className="flex h-48 items-center justify-center rounded-xl border border-gray-200 bg-white">
            <p className="text-sm text-gray-500">
              No {activeTab === 'permanent' ? 'permanent' : 'contract'} pipeline data for {data.monthLabel}
            </p>
          </div>
        )}
      </div>

      <PipelineDrillDownSheet monthStart={monthStart} />
      <ConsultantJobsSheet monthStart={monthStart} />
    </PipelineDrillDownProvider>
  );
}

function formatCompact(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

function JobCountSummary({ rows }: { rows: PipelineRow[] }) {
  const openJobs = useMemo(() => {
    let total = 0;
    for (const r of rows) {
      if (r.type === 'team') total += r.openJobs;
    }
    return total;
  }, [rows]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm">
      <span className="text-gray-500">Open jobs: </span>
      <span className="font-semibold text-gray-900">{openJobs}</span>
    </div>
  );
}
