'use client';

import {
  KPICard,
  TimeSeriesChart,
  BarChart,
  DonutChart,
  TargetGauge,
  AnimatedLeaderboard,
  TimeSeriesCombo,
  ConversionIndicator,
  Heatmap,
  StackedBarChart,
  WidgetErrorBoundary,
} from '@/components/widgets';
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
        <WidgetErrorBoundary fallbackTitle="Reference Checks failed">
          <KPICard
            assetKey="reference_check_count"
            icon={UserCheck}
            colorScheme="green"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
      </div>

      {/* ================================================================ */}
      {/* Conversion Indicators (single_value shape, direct-value mode) */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <WidgetErrorBoundary fallbackTitle="Conversion failed">
          <ConversionIndicator
            title="Submit → Review"
            fromLabel="Submitted"
            toLabel="Review"
            value={0.667}
            previousValue={0.62}
            colorScheme="teal"
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Conversion failed">
          <ConversionIndicator
            title="Review → Interview"
            fromLabel="Review"
            toLabel="Interview"
            value={0.625}
            previousValue={0.58}
            colorScheme="green"
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Conversion failed">
          <ConversionIndicator
            title="Interview → Offer"
            fromLabel="Interview"
            toLabel="Offer"
            value={0.429}
            previousValue={0.45}
            colorScheme="purple"
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Conversion failed">
          <ConversionIndicator
            title="Offer → Placed"
            fromLabel="Offer"
            toLabel="Placed"
            value={0.533}
            previousValue={0.50}
            colorScheme="orange"
          />
        </WidgetErrorBoundary>
      </div>

      {/* ================================================================ */}
      {/* Target Gauges (single_value shape) */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <WidgetErrorBoundary fallbackTitle="Call Target failed">
          <TargetGauge
            assetKey="candidate_call_count"
            title="Candidate Call Target"
            targetValue={200}
            targetLabel="Monthly Target"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="BD Call Target failed">
          <TargetGauge
            assetKey="bd_call_count"
            title="BD Call Target"
            targetValue={50}
            targetLabel="Monthly Target"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Meeting Target failed">
          <TargetGauge
            assetKey="candidate_meeting_count"
            title="Meeting Target"
            targetValue={30}
            targetLabel="Monthly Target"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Client Meeting Target failed">
          <TargetGauge
            assetKey="client_meeting_count"
            title="Client Meeting Target"
            targetValue={20}
            targetLabel="Monthly Target"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
      </div>

      {/* ================================================================ */}
      {/* Time Series Charts (time_series shape) */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WidgetErrorBoundary fallbackTitle="Candidate Call chart failed">
          <TimeSeriesChart
            assetKey="candidate_call_count"
            title="Candidate Call Activity"
            chartType="area"
            color="#00E5C0"
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

      {/* ================================================================ */}
      {/* Combo Chart (time_series shape, bar + moving average) */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WidgetErrorBoundary fallbackTitle="Combo chart failed">
          <TimeSeriesCombo
            assetKey="candidate_call_count"
            title="Candidate Calls: Daily + 7-Day Average"
            barColor="#00E5C0"
            lineColor="#ef4444"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Combo chart failed">
          <TimeSeriesCombo
            assetKey="bd_call_count"
            title="BD Calls: Daily + 7-Day Average"
            barColor="#8b5cf6"
            lineColor="#f59e0b"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
      </div>

      {/* ================================================================ */}
      {/* Bar Charts + Donut Chart (categorical shape) */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
        <WidgetErrorBoundary fallbackTitle="Donut chart failed">
          <DonutChart
            assetKey="candidate_call_count"
            title="Call Distribution by Consultant"
            chartType="donut"
            dateRange={dateRange}
            limit={6}
          />
        </WidgetErrorBoundary>
      </div>

      {/* ================================================================ */}
      {/* Leaderboard + Stacked Bar (categorical shape) */}
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
        <WidgetErrorBoundary fallbackTitle="Stacked Bar failed">
          <StackedBarChart
            assetKey="candidate_call_count"
            title="Activity Breakdown by Consultant"
            dateRange={dateRange}
            limit={6}
          />
        </WidgetErrorBoundary>
      </div>

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
