'use client';

import {
  KPICard,
  Heatmap,
  MultiLineChart,
  RevenueLeaderboard,
  DeliveryPerformanceChart,
  SalesPerformanceChart,
  WidgetErrorBoundary,
} from '@/components/widgets';
import {
  Phone,
  Users,
  Coffee,
  TrendingUp,
  Briefcase,
  Send,
  UserCheck,
  Star,
  Award,
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
        {/* Row 1: Sales leading */}
        <WidgetErrorBoundary fallbackTitle="Client Calls failed">
          <KPICard
            assetKey="client_call_count"
            icon={TrendingUp}
            colorScheme="purple"
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
        {/* Row 2: Delivery activities */}
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
        <WidgetErrorBoundary fallbackTitle="Submittals failed">
          <KPICard
            assetKey="submittal_count"
            icon={Send}
            colorScheme="teal"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
        {/* Row 3: Outcomes */}
        <WidgetErrorBoundary fallbackTitle="First Interviews failed">
          <KPICard
            assetKey="first_interview_count"
            icon={UserCheck}
            colorScheme="green"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Strategic Referrals failed">
          <KPICard
            assetKey="strategic_referral_count"
            icon={Star}
            colorScheme="orange"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Placements failed">
          <KPICard
            assetKey="placement_count"
            icon={Award}
            colorScheme="teal"
            dateRange={dateRange}
          />
        </WidgetErrorBoundary>
      </div>

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
      {/* Leaderboards (categorical + revenue) */}
      {/* ================================================================ */}
      <WidgetErrorBoundary fallbackTitle="Revenue Leaderboard failed">
        <RevenueLeaderboard
          title="Revenue Leaderboard"
          dateRange={dateRange}
          limit={10}
        />
      </WidgetErrorBoundary>

      {/* ================================================================ */}
      {/* Sales Performance (horizontal stacked bar) */}
      {/* ================================================================ */}
      <WidgetErrorBoundary fallbackTitle="Sales Performance failed">
        <SalesPerformanceChart
          title="Sales Activity Top Performers"
          dateRange={dateRange}
          limit={10}
        />
      </WidgetErrorBoundary>

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
