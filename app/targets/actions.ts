'use server';

import { createClient } from '@/lib/supabase/server';
import { TARGET_CATEGORIES } from '@/lib/targets/constants';
import type { MonthTargets, MyTargetValue } from '@/lib/targets/types';
import {
  getMonthStart,
  getMonthEnd,
  formatMonthLabel,
  navigateMonth,
} from '@/lib/targets/month-utils';

type ActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

/**
 * Fetches the current user's targets for the specified month,
 * plus a 6-month history.
 */
export async function getMyTargets(
  monthStart: string
): Promise<
  ActionResult<{
    current: MonthTargets;
    history: MonthTargets[];
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // Build the list of months: current + 5 previous = 6 total
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

  // Fetch all targets for this user across the date range
  const { data: targets, error } = await supabase
    .from('consultant_targets')
    .select('target_type, target_value, period_start')
    .eq('consultant_id', user.id)
    .gte('period_start', months[0].start)
    .lte('period_start', months[months.length - 1].start);

  if (error) return { error: error.message };

  // Build lookup: "period_start:target_type" → value
  const lookup = new Map<string, number>();
  for (const t of targets ?? []) {
    lookup.set(`${t.period_start}:${t.target_type}`, Number(t.target_value));
  }

  function buildMonth(m: { start: string; label: string }): MonthTargets {
    const values: MyTargetValue[] = TARGET_CATEGORIES.map((cat) => ({
      targetKey: cat.key,
      label: cat.label,
      value: lookup.get(`${m.start}:${cat.key}`) ?? null,
      unit: cat.unit,
    }));
    return {
      monthStart: m.start,
      monthLabel: m.label,
      targets: values,
    };
  }

  // Current month is the last element
  const current = buildMonth(months[months.length - 1]);
  const history = months.map(buildMonth);

  return { data: { current, history } };
}
