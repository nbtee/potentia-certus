'use server';

import { createClient } from '@/lib/supabase/server';
import { TARGET_CATEGORIES } from '@/lib/targets/constants';
import type { CategoryPerformance, MonthPerformance, PerformanceData } from '@/lib/targets/types';
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
  monthStart: string
): Promise<ActionResult<PerformanceData>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // Build 6-month window
  const currentDate = new Date(monthStart + 'T00:00:00');
  const months: { start: string; end: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = navigateMonth(currentDate, -i);
    months.push({
      start: getMonthStart(d),
      end: getMonthEnd(d),
      label: formatMonthLabel(d),
    });
  }

  const rangeStart = months[0].start;
  const rangeEnd = months[months.length - 1].end;

  // Fire all 4 queries in parallel
  const [targetsRes, activitiesRes, placementsRes, referralsRes] = await Promise.all([
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

    // 3. Placements for revenue
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
  ]);

  if (targetsRes.error) return { error: targetsRes.error.message };
  if (activitiesRes.error) return { error: activitiesRes.error.message };
  if (placementsRes.error) return { error: placementsRes.error.message };
  if (referralsRes.error) return { error: referralsRes.error.message };

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

  // --- Assemble per-month performance ---
  function buildMonth(m: { start: string; label: string }): MonthPerformance {
    const categories: CategoryPerformance[] = TARGET_CATEGORIES.map((cat) => {
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

    return {
      monthStart: m.start,
      monthLabel: m.label,
      categories,
    };
  }

  const history = months.map(buildMonth);
  const current = history[history.length - 1];

  return { data: { current, history } };
}
