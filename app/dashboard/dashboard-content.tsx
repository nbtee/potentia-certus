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
import { useAssetDescriptions } from '@/lib/data-assets/use-asset-descriptions';
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
  const descriptions = useAssetDescriptions();

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
            colorScheme="violet"
            dateRange={dateRange}
            description={descriptions.get('client_call_count')}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Client Meetings failed">
          <KPICard
            assetKey="client_meeting_count"
            icon={Coffee}
            colorScheme="rose"
            dateRange={dateRange}
            description={descriptions.get('client_meeting_count')}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="New Jobs failed">
          <KPICard
            assetKey="job_order_count"
            icon={Briefcase}
            colorScheme="violet"
            dateRange={dateRange}
            description={descriptions.get('job_order_count')}
          />
        </WidgetErrorBoundary>
        {/* Row 2: Delivery activities */}
        <WidgetErrorBoundary fallbackTitle="Candidate Calls failed">
          <KPICard
            assetKey="candidate_call_count"
            icon={Phone}
            colorScheme="aqua"
            dateRange={dateRange}
            description={descriptions.get('candidate_call_count')}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Candidate Meetings failed">
          <KPICard
            assetKey="candidate_meeting_count"
            icon={Users}
            colorScheme="ocean"
            dateRange={dateRange}
            description={descriptions.get('candidate_meeting_count')}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Submittals failed">
          <KPICard
            assetKey="submittal_count"
            icon={Send}
            colorScheme="aqua"
            dateRange={dateRange}
            description={descriptions.get('submittal_count')}
          />
        </WidgetErrorBoundary>
        {/* Row 3: Outcomes */}
        <WidgetErrorBoundary fallbackTitle="First Interviews failed">
          <KPICard
            assetKey="first_interview_count"
            icon={UserCheck}
            colorScheme="ocean"
            dateRange={dateRange}
            description={descriptions.get('first_interview_count')}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Strategic Referrals failed">
          <KPICard
            assetKey="strategic_referral_count"
            icon={Star}
            colorScheme="rose"
            dateRange={dateRange}
            description={descriptions.get('strategic_referral_count')}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary fallbackTitle="Placements failed">
          <KPICard
            assetKey="placement_count"
            icon={Award}
            colorScheme="aqua"
            dateRange={dateRange}
            description={descriptions.get('placement_count')}
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
            { assetKey: 'bd_call_count', label: 'BD Calls', color: '#00C9A7', yAxisId: 'left' },
            { assetKey: 'client_meeting_count', label: 'Client Meetings', color: '#3B9EB5', yAxisId: 'left' },
            { assetKey: 'job_order_count', label: 'New Jobs', color: '#8566A8', yAxisId: 'right' },
            { assetKey: 'placement_count', label: 'Placements', color: '#C75591', yAxisId: 'right' },
          ]}
          dualAxis
          dateRange={dateRange}
          height={400}
          description="Compares leading sales activities (BD calls, client meetings) against lagging outcomes (new jobs, placements) over time. The left axis shows activity volume, the right axis shows outcomes. Look for activity trends that precede outcome changes by 2-4 weeks."
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
          description="Ranks consultants by total revenue from placements in the selected period. Permanent placements use the fee amount; contract placements use gross profit per hour multiplied by estimated working hours. Click a consultant to see their individual placement details."
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
          description="Shows the top consultants by total client-facing sales activity. Stacked bars break down BD calls, AD/AM calls, and client meetings. Higher totals indicate stronger business development effort. Compare bar composition to see whether a consultant leans toward phone or in-person outreach."
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
          description="Shows the top consultants by total candidate-facing delivery activity. Stacked bars break down candidate calls, candidate meetings, submittals, interview feedback, and reference checks. Higher totals indicate stronger delivery effort across the recruitment funnel."
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
          description={descriptions.get('activity_heatmap')}
        />
      </WidgetErrorBoundary>

    </div>
  );
}
