'use client';

import { KPICard } from '@/components/widgets/kpi-card';
import { TimeSeriesChart } from '@/components/widgets/time-series-chart';
import { BarChart } from '@/components/widgets/bar-chart';
import { WidgetErrorBoundary } from '@/components/widgets/widget-error-boundary';
import {
  Phone,
  Users,
  Coffee,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { useDateRange } from '@/lib/contexts/filter-context';

export function DashboardContent() {
  // Get date range from filter context — updates automatically when filters change
  const dateRange = useDateRange();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Activity Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Sales and recruitment activity insights
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <WidgetErrorBoundary fallbackTitle="Candidate Calls failed">
          <KPICard
            assetKey="candidate_call_count"
            icon={Phone}
            colorScheme="blue"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Candidate Meetings failed">
          <KPICard
            assetKey="candidate_meeting_count"
            icon={Users}
            colorScheme="green"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="BD Calls failed">
          <KPICard
            assetKey="bd_call_count"
            icon={TrendingUp}
            colorScheme="purple"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="AD Calls failed">
          <KPICard
            assetKey="ad_call_count"
            icon={Phone}
            colorScheme="blue"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Client Meetings failed">
          <KPICard
            assetKey="client_meeting_count"
            icon={Coffee}
            colorScheme="orange"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Reference Checks failed">
          <KPICard
            assetKey="reference_check_count"
            icon={UserCheck}
            colorScheme="green"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
      </div>

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WidgetErrorBoundary fallbackTitle="Candidate Call chart failed">
          <TimeSeriesChart
            assetKey="candidate_call_count"
            title="Candidate Call Activity"
            chartType="area"
            color="#3b82f6"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="BD Call chart failed">
          <TimeSeriesChart
            assetKey="bd_call_count"
            title="Business Development Calls"
            chartType="area"
            color="#8b5cf6"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WidgetErrorBoundary fallbackTitle="Candidate Meeting chart failed">
          <TimeSeriesChart
            assetKey="candidate_meeting_count"
            title="Candidate Meetings"
            chartType="line"
            color="#10b981"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Client Meeting chart failed">
          <TimeSeriesChart
            assetKey="client_meeting_count"
            title="Client Meetings & Catch-ups"
            chartType="line"
            color="#f59e0b"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
      </div>

      {/* Bar Charts - Rankings and Comparisons */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WidgetErrorBoundary fallbackTitle="Top Performers chart failed">
          <BarChart
            assetKey="candidate_call_count"
            title="Top Performers: Candidate Calls"
            dimension="consultant"
            orientation="vertical"
            color="#3b82f6"
            dateRange={dateRange}
            limit={8}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Top Performers chart failed">
          <BarChart
            assetKey="bd_call_count"
            title="Top Performers: BD Calls"
            dimension="consultant"
            orientation="vertical"
            color="#8b5cf6"
            dateRange={dateRange}
            limit={8}
          />
        </WidgetErrorBoundary>
      </div>
    </div>
  );
}
