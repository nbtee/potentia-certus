'use client';

import {
  KPICard,
  TimeSeriesChart,
  BarChart,
  AnimatedLeaderboard,
  Heatmap,
  MultiLineChart,
  RevenueLeaderboard,
  DeliveryPerformanceChart,
  WidgetErrorBoundary,
} from '@/components/widgets';
import {
  Phone,
  Users,
  Coffee,
  TrendingUp,
  Briefcase,
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

      {/* ================================================================ */}
      {/* KPI Cards (single_value shape) */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <WidgetErrorBoundary fallbackTitle="Candidate Calls failed">
          <KPICard
            assetKey="candidate_call_count"
            icon={Phone}
            colorScheme="teal"
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
            colorScheme="teal"
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
        <WidgetErrorBoundary fallbackTitle="New Jobs failed">
          <KPICard
            assetKey="job_order_count"
            icon={Briefcase}
            colorScheme="purple"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
      </div>

      {/* ================================================================ */}
      {/* Time Series Charts (time_series shape) */}
      {/* ================================================================ */}
      <WidgetErrorBoundary fallbackTitle="Candidate Call chart failed">
        <TimeSeriesChart
          assetKey="candidate_call_count"
          title="Candidate Call Activity"
          chartType="area"
          color="#00E5C0"
          dateRange={dateRange}
        />
      </WidgetErrorBoundary>

      {/* ================================================================ */}
      {/* Multi-Line Comparison (Activity vs Outcomes) */}
      {/* ================================================================ */}
      <WidgetErrorBoundary fallbackTitle="Activity Comparison failed">
        <MultiLineChart
          title="Activity vs Outcomes"
          lines={[
            { assetKey: 'bd_call_count', label: 'BD Calls', color: '#8b5cf6', yAxisId: 'left' },
            { assetKey: 'client_meeting_count', label: 'Client Meetings', color: '#f59e0b', yAxisId: 'left' },
            { assetKey: 'job_order_count', label: 'New Jobs', color: '#00E5C0', yAxisId: 'right' },
            { assetKey: 'placement_count', label: 'Placements', color: '#ef4444', yAxisId: 'right' },
          ]}
          dualAxis
          dateRange={dateRange}
          height={400}
        />
      </WidgetErrorBoundary>

      {/* ================================================================ */}
      {/* Bar Charts + Donut Chart (categorical shape) */}
      {/* ================================================================ */}
      <WidgetErrorBoundary fallbackTitle="Top Performers chart failed">
        <BarChart
          assetKey="candidate_call_count"
          title="Top Performers: Candidate Calls"
          dimension="consultant"
          orientation="vertical"
          color="#00E5C0"
          dateRange={dateRange}
          limit={8}
        />
      </WidgetErrorBoundary>

      {/* ================================================================ */}
      {/* Leaderboards (categorical + revenue) */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WidgetErrorBoundary fallbackTitle="Leaderboard failed">
          <AnimatedLeaderboard
            assetKey="candidate_call_count"
            title="Candidate Call Leaderboard"
            dateRange={dateRange}
            limit={8}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Revenue Leaderboard failed">
          <RevenueLeaderboard
            title="Revenue Leaderboard"
            dateRange={dateRange}
            limit={10}
          />
        </WidgetErrorBoundary>
      </div>

      {/* ================================================================ */}
      {/* Delivery Performance (horizontal stacked bar) */}
      {/* ================================================================ */}
      <WidgetErrorBoundary fallbackTitle="Delivery Performance failed">
        <DeliveryPerformanceChart
          title="Delivery Activity Top Performers"
          dateRange={dateRange}
          limit={10}
        />
      </WidgetErrorBoundary>

      {/* ================================================================ */}
      {/* Heatmap (matrix shape) */}
      {/* ================================================================ */}
      <WidgetErrorBoundary fallbackTitle="Heatmap failed">
        <Heatmap
          assetKey="activity_heatmap"
          title="Activity Heatmap: Consultants vs Activity Types"
          dateRange={dateRange}
          height={400}
        />
      </WidgetErrorBoundary>

    </div>
  );
}
