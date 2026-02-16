'use client';

import { KPICard } from '@/components/widgets/kpi-card';
import { TimeSeriesChart } from '@/components/widgets/time-series-chart';
import { BarChart } from '@/components/widgets/bar-chart';
import {
  Phone,
  Users,
  Coffee,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { useDateRange } from '@/lib/contexts/filter-context';

export function DashboardContent() {
  // Get date range from filter context
  const dateRange = useDateRange();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Activity Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Sales and recruitment activity insights for the last 30 days
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          assetKey="candidate_call_count"
          icon={Phone}
          colorScheme="blue"
          dateRange={dateRange}
        />
        <KPICard
          assetKey="candidate_meeting_count"
          icon={Users}
          colorScheme="green"
          dateRange={dateRange}
        />
        <KPICard
          assetKey="bd_call_count"
          icon={TrendingUp}
          colorScheme="purple"
          dateRange={dateRange}
        />
        <KPICard
          assetKey="ad_call_count"
          icon={Phone}
          colorScheme="blue"
          dateRange={dateRange}
        />
        <KPICard
          assetKey="client_meeting_count"
          icon={Coffee}
          colorScheme="orange"
          dateRange={dateRange}
        />
        <KPICard
          assetKey="reference_check_count"
          icon={UserCheck}
          colorScheme="green"
          dateRange={dateRange}
        />
      </div>

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TimeSeriesChart
          assetKey="candidate_call_count"
          title="Candidate Call Activity"
          chartType="area"
          color="#3b82f6"
          dateRange={dateRange}
        />
        <TimeSeriesChart
          assetKey="bd_call_count"
          title="Business Development Calls"
          chartType="area"
          color="#8b5cf6"
          dateRange={dateRange}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TimeSeriesChart
          assetKey="candidate_meeting_count"
          title="Candidate Meetings"
          chartType="line"
          color="#10b981"
          dateRange={dateRange}
        />
        <TimeSeriesChart
          assetKey="client_meeting_count"
          title="Client Meetings & Catch-ups"
          chartType="line"
          color="#f59e0b"
          dateRange={dateRange}
        />
      </div>

      {/* Bar Charts - Rankings and Comparisons */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarChart
          assetKey="candidate_call_count"
          title="Top Performers: Candidate Calls"
          dimension="consultant"
          orientation="vertical"
          color="#3b82f6"
          dateRange={dateRange}
          limit={8}
        />
        <BarChart
          assetKey="bd_call_count"
          title="Top Performers: BD Calls"
          dimension="consultant"
          orientation="vertical"
          color="#8b5cf6"
          dateRange={dateRange}
          limit={8}
        />
      </div>
    </div>
  );
}
