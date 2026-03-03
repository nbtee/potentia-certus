'use server';

import { createClient } from '@/lib/supabase/server';
import { TARGET_CATEGORIES, PLACEMENT_TITLES, PLACEMENT_TITLE_EXCLUDED_CATEGORIES } from '@/lib/targets/constants';
import type { CategoryPerformance, MonthPerformance, PerformanceData, TimeWindow } from '@/lib/targets/types';
import {
  getMonthStart,
  getMonthEnd,
  formatMonthLabel,
  navigateMonth,
} from '@/lib/targets/month-utils';

type ActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

// Build a lookup of activity_type → target category key
const ACTIVITY_TYPE_TO_CATEGORY = new Map<string, string>();
for (const cat of TARGET_CATEGORIES) {
  for (const at of cat.activityTypes) {
    ACTIVITY_TYPE_TO_CATEGORY.set(at, cat.key);
  }
}

// All activity types we care about (flat list for the DB filter)
const ALL_ACTIVITY_TYPES = TARGET_CATEGORIES.flatMap((c) => c.activityTypes);

// Submission statuses for conversion rate calculation
const INTERVIEW_STATUSES = new Set(['Client Interview 1', 'Client Interview 2', 'Client Interview Final']);
const CONVERSION_STATUSES = ['Submittal', 'Client Interview 1', 'Client Interview 2', 'Client Interview Final', 'Placed'];

function calcContractRevenue(gpPerHour: number, startDate: string | null, endDate: string | null): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  return (gpPerHour * 8 * days) / 1000;
}

/**
 * Fetches the current user's performance (actuals vs targets) for the selected
 * month plus a 6-month history window.
 */
export async function getMyPerformance(
  monthStart: string,
  timeWindow: TimeWindow = '6-month'
): Promise<ActionResult<PerformanceData>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // Fetch user title to determine which categories to show
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('title')
    .eq('id', user.id)
    .single();

  const userTitle = profile?.title ?? null;
  const isPlacementTitle = userTitle !== null && PLACEMENT_TITLES.has(userTitle);

  // Filter categories based on title
  const visibleCategories = isPlacementTitle
    ? TARGET_CATEGORIES.filter((c) => !PLACEMENT_TITLE_EXCLUDED_CATEGORIES.has(c.key))
    : TARGET_CATEGORIES;

  // Build month window based on timeWindow
  const currentDate = new Date(monthStart + 'T00:00:00');
  const months: { start: string; end: string; label: string }[] = [];
  if (timeWindow === 'ytd') {
    // January of the selected month's year through the selected month
    const year = currentDate.getFullYear();
    const selectedMonthIndex = currentDate.getMonth(); // 0-based
    for (let m = 0; m <= selectedMonthIndex; m++) {
      const d = new Date(year, m, 1);
      months.push({
        start: getMonthStart(d),
        end: getMonthEnd(d),
        label: formatMonthLabel(d),
      });
    }
  } else {
    // 6-month rolling window (default)
    for (let i = 5; i >= 0; i--) {
      const d = navigateMonth(currentDate, -i);
      months.push({
        start: getMonthStart(d),
        end: getMonthEnd(d),
        label: formatMonthLabel(d),
      });
    }
  }

  const rangeStart = months[0].start;
  const rangeEnd = months[months.length - 1].end;

  // Fire all queries in parallel (5th query only for TM/STM)
  const [targetsRes, activitiesRes, placementsRes, referralsRes, submissionsRes] = await Promise.all([
    // 1. Targets for this user across 6 months
    supabase
      .from('consultant_targets')
      .select('target_type, target_value, period_start')
      .eq('consultant_id', user.id)
      .gte('period_start', rangeStart)
      .lte('period_start', months[months.length - 1].start),

    // 2. Activities (only the types that map to target categories)
    supabase
      .from('activities')
      .select('activity_type, activity_date')
      .eq('consultant_id', user.id)
      .gte('activity_date', rangeStart)
      .lte('activity_date', rangeEnd + 'T23:59:59')
      .in('activity_type', ALL_ACTIVITY_TYPES)
      .limit(10000),

    // 3. Placements for revenue + placement count
    supabase
      .from('placements')
      .select('revenue_type, fee_amount, gp_per_hour, start_date, end_date, placement_date')
      .eq('consultant_id', user.id)
      .gte('placement_date', rangeStart)
      .lte('placement_date', rangeEnd),

    // 4. Strategic referrals
    supabase
      .from('strategic_referrals')
      .select('referral_date')
      .eq('consultant_id', user.id)
      .gte('referral_date', rangeStart)
      .lte('referral_date', rangeEnd + 'T23:59:59'),

    // 5. Submission status log (TM/STM only — for conversion rates)
    isPlacementTitle
      ? supabase
          .from('submission_status_log')
          .select('status_to, detected_at')
          .eq('consultant_id', user.id)
          .gte('detected_at', rangeStart)
          .lte('detected_at', rangeEnd)
          .in('status_to', CONVERSION_STATUSES)
          .limit(10000)
      : Promise.resolve({ data: [] as { status_to: string; detected_at: string }[], error: null }),
  ]);

  if (targetsRes.error) return { error: targetsRes.error.message };
  if (activitiesRes.error) return { error: activitiesRes.error.message };
  if (placementsRes.error) return { error: placementsRes.error.message };
  if (referralsRes.error) return { error: referralsRes.error.message };
  if (submissionsRes.error) return { error: submissionsRes.error.message };

  // --- Build target lookup: "YYYY-MM-01:category_key" → value ---
  const targetLookup = new Map<string, number>();
  for (const t of targetsRes.data ?? []) {
    targetLookup.set(`${t.period_start}:${t.target_type}`, Number(t.target_value));
  }

  // --- Build activity counts: "YYYY-MM-01:category_key" → count ---
  const activityCounts = new Map<string, number>();
  for (const a of activitiesRes.data ?? []) {
    const catKey = ACTIVITY_TYPE_TO_CATEGORY.get(a.activity_type);
    if (!catKey) continue;
    const d = new Date(a.activity_date);
    const ms = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const key = `${ms}:${catKey}`;
    activityCounts.set(key, (activityCounts.get(key) ?? 0) + 1);
  }

  // --- Build revenue by month: "YYYY-MM-01" → total revenue ---
  const revenueLookup = new Map<string, number>();
  for (const p of placementsRes.data ?? []) {
    const d = new Date(p.placement_date);
    const ms = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    let amount = 0;
    if (p.revenue_type === 'permanent') {
      amount = Number(p.fee_amount) || 0;
    } else {
      amount = calcContractRevenue(Number(p.gp_per_hour) || 0, p.start_date, p.end_date);
    }
    revenueLookup.set(ms, (revenueLookup.get(ms) ?? 0) + amount);
  }

  // --- Build referral counts by month: "YYYY-MM-01" → count ---
  const referralCounts = new Map<string, number>();
  for (const r of referralsRes.data ?? []) {
    const d = new Date(r.referral_date);
    const ms = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    referralCounts.set(ms, (referralCounts.get(ms) ?? 0) + 1);
  }

  // --- Build submission counts by month+status for conversion rates (TM/STM only) ---
  // Keys: "YYYY-MM-01:submittal" | "YYYY-MM-01:interview" | "YYYY-MM-01:placed"
  const submissionCounts = new Map<string, number>();
  if (isPlacementTitle) {
    for (const s of submissionsRes.data ?? []) {
      const d = new Date(s.detected_at);
      const ms = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      let bucket: string | null = null;
      if (s.status_to === 'Submittal') bucket = 'submittal';
      else if (INTERVIEW_STATUSES.has(s.status_to)) bucket = 'interview';
      else if (s.status_to === 'Placed') bucket = 'placed';
      if (bucket) {
        const key = `${ms}:${bucket}`;
        submissionCounts.set(key, (submissionCounts.get(key) ?? 0) + 1);
      }
      // Separate bucket for first interview count (tile, not rate)
      if (s.status_to === 'Client Interview 1') {
        const fiKey = `${ms}:first_interview`;
        submissionCounts.set(fiKey, (submissionCounts.get(fiKey) ?? 0) + 1);
      }
    }
  }

  // --- Assemble per-month performance ---
  function buildMonth(m: { start: string; label: string }): MonthPerformance {
    const categories: CategoryPerformance[] = visibleCategories.map((cat) => {
      let actual = 0;
      if (cat.key === 'revenue') {
        actual = revenueLookup.get(m.start) ?? 0;
      } else if (cat.key === 'strategic_referrals') {
        actual = referralCounts.get(m.start) ?? 0;
      } else {
        actual = activityCounts.get(`${m.start}:${cat.key}`) ?? 0;
      }

      const target = targetLookup.get(`${m.start}:${cat.key}`) ?? null;
      const percentage = target !== null && target > 0
        ? Math.round((actual / target) * 100)
        : null;

      return {
        targetKey: cat.key,
        label: cat.label,
        unit: cat.unit,
        actual,
        target,
        percentage,
      };
    });

    // Append conversion rate entries for TM/STM users
    if (isPlacementTitle) {
      const submittals = submissionCounts.get(`${m.start}:submittal`) ?? 0;
      const interviews = submissionCounts.get(`${m.start}:interview`) ?? 0;
      const placed = submissionCounts.get(`${m.start}:placed`) ?? 0;

      const subToInterviewRate = submittals > 0
        ? Math.round((interviews / submittals) * 1000) / 10
        : 0;
      const interviewToPlacementRate = interviews > 0
        ? Math.round((placed / interviews) * 1000) / 10
        : 0;

      const firstInterviews = submissionCounts.get(`${m.start}:first_interview`) ?? 0;
      categories.push({
        targetKey: 'first_interviews',
        label: 'First Interviews',
        unit: 'count',
        actual: firstInterviews,
        target: null,
        percentage: null,
      });

      categories.push({
        targetKey: 'sub_to_interview_rate',
        label: 'Sub → Interview',
        unit: 'count',
        format: 'percentage',
        actual: subToInterviewRate,
        target: null,
        percentage: null,
        metadata: { numerator: interviews, denominator: submittals },
      });

      categories.push({
        targetKey: 'interview_to_placement_rate',
        label: 'Interview → Placement',
        unit: 'count',
        format: 'percentage',
        actual: interviewToPlacementRate,
        target: null,
        percentage: null,
        metadata: { numerator: placed, denominator: interviews },
      });
    }

    return {
      monthStart: m.start,
      monthLabel: m.label,
      categories,
    };
  }

  const history = months.map(buildMonth);
  const current = history[history.length - 1];

  return { data: { current, history, userTitle } };
}
