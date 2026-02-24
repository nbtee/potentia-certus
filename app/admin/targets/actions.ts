'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { writeAuditLog } from '@/lib/admin/audit';
import { getMonthEnd } from '@/lib/targets/month-utils';
import type {
  MonthlyTargetGrid,
  TargetRegionGroup,
  TargetTeamGroup,
  TargetConsultantRow,
  UpsertTargetInput,
} from '@/lib/admin/types';

type ActionResult<T = void> =
  | { data: T; error?: never }
  | { data?: never; error: string };

async function requireAdminOrManager(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'manager') return null;
  return user.id;
}

// =============================================================================
// List Targets For Month (spreadsheet grid data)
// =============================================================================

export async function listTargetsForMonth(
  monthStart: string
): Promise<ActionResult<MonthlyTargetGrid>> {
  const userId = await requireAdminOrManager();
  if (!userId) return { error: 'Admin or manager access required' };

  const supabase = await createClient();

  // Parse month start to compute month end
  const monthDate = new Date(monthStart + 'T00:00:00');
  const monthEnd = getMonthEnd(monthDate);

  // Fetch all active consultants with their hierarchy node
  const { data: consultants, error: cErr } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name, hierarchy_node_id')
    .eq('is_active', true)
    .order('last_name');

  if (cErr) return { error: cErr.message };

  // Fetch hierarchy nodes (teams + regions)
  const { data: nodes, error: nErr } = await supabase
    .from('org_hierarchy')
    .select('id, parent_id, name, hierarchy_level')
    .in('hierarchy_level', ['team', 'region']);

  if (nErr) return { error: nErr.message };

  // Fetch existing targets for this month
  const { data: targets, error: tErr } = await supabase
    .from('consultant_targets')
    .select('id, consultant_id, target_type, target_value')
    .eq('period_start', monthStart);

  if (tErr) return { error: tErr.message };

  // Build lookup maps
  const nodeMap = new Map(
    (nodes ?? []).map((n) => [n.id, n])
  );

  const targetsByConsultant = new Map<
    string,
    Record<string, { id: string; value: number }>
  >();
  for (const t of targets ?? []) {
    if (!targetsByConsultant.has(t.consultant_id)) {
      targetsByConsultant.set(t.consultant_id, {});
    }
    targetsByConsultant.get(t.consultant_id)![t.target_type] = {
      id: t.id,
      value: Number(t.target_value),
    };
  }

  // Group consultants by region → team
  const regionMap = new Map<string, TargetRegionGroup>();
  const unassignedTeam: TargetConsultantRow[] = [];

  for (const c of consultants ?? []) {
    const row: TargetConsultantRow = {
      consultantId: c.id,
      firstName: c.first_name ?? '',
      lastName: c.last_name ?? '',
      targets: targetsByConsultant.get(c.id) ?? {},
    };

    const teamNode = c.hierarchy_node_id
      ? nodeMap.get(c.hierarchy_node_id)
      : null;

    if (!teamNode || teamNode.hierarchy_level !== 'team') {
      unassignedTeam.push(row);
      continue;
    }

    const regionNode = teamNode.parent_id
      ? nodeMap.get(teamNode.parent_id)
      : null;
    const regionId = regionNode?.id ?? 'unassigned-region';
    const regionName = regionNode?.name ?? 'Unassigned';

    if (!regionMap.has(regionId)) {
      regionMap.set(regionId, {
        regionNodeId: regionId,
        regionName,
        teams: [],
      });
    }

    const region = regionMap.get(regionId)!;
    let team = region.teams.find((t) => t.teamNodeId === teamNode.id);
    if (!team) {
      team = {
        teamNodeId: teamNode.id,
        teamName: teamNode.name,
        consultants: [],
      };
      region.teams.push(team);
    }
    team.consultants.push(row);
  }

  const regions = Array.from(regionMap.values());

  // Add unassigned at the end if any
  if (unassignedTeam.length > 0) {
    regions.push({
      regionNodeId: 'unassigned-region',
      regionName: 'Unassigned',
      teams: [
        {
          teamNodeId: 'unassigned-team',
          teamName: 'No Team',
          consultants: unassignedTeam,
        },
      ],
    });
  }

  // Sort teams within each region
  for (const region of regions) {
    region.teams.sort((a, b) => a.teamName.localeCompare(b.teamName));
    for (const team of region.teams) {
      team.consultants.sort((a, b) =>
        a.lastName.localeCompare(b.lastName)
      );
    }
  }

  return {
    data: { monthStart, monthEnd, regions },
  };
}

// =============================================================================
// Bulk Upsert Targets
// =============================================================================

const upsertTargetSchema = z.object({
  consultant_id: z.string().uuid(),
  target_type: z.string().min(1),
  target_value: z.number().nonnegative(),
  period_start: z.string().min(1),
  period_end: z.string().min(1),
});

const bulkUpsertSchema = z.array(upsertTargetSchema).min(1).max(1000);

export async function bulkUpsertTargets(
  targets: UpsertTargetInput[]
): Promise<ActionResult<{ count: number }>> {
  const userId = await requireAdminOrManager();
  if (!userId) return { error: 'Admin or manager access required' };

  const parsed = bulkUpsertSchema.safeParse(targets);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  const { data: count, error } = await supabase.rpc('upsert_monthly_targets', {
    p_targets: parsed.data,
    p_created_by: userId,
  });

  if (error) return { error: error.message };

  await writeAuditLog('target.bulk_upsert', 'consultant_targets', undefined, null, {
    count: count ?? parsed.data.length,
    month: parsed.data[0].period_start,
  });

  return { data: { count: count ?? parsed.data.length } };
}

// =============================================================================
// Copy From Previous Month
// =============================================================================

export async function copyFromPreviousMonth(
  sourceMonthStart: string,
  destMonthStart: string
): Promise<ActionResult<{ count: number }>> {
  const userId = await requireAdminOrManager();
  if (!userId) return { error: 'Admin or manager access required' };

  const supabase = await createClient();

  // Get source month targets
  const { data: sourceTargets, error: sErr } = await supabase
    .from('consultant_targets')
    .select('consultant_id, target_type, target_value')
    .eq('period_start', sourceMonthStart);

  if (sErr) return { error: sErr.message };
  if (!sourceTargets?.length) {
    return { error: 'No targets found in the source month' };
  }

  // Get existing dest targets to avoid overwriting
  const { data: existingTargets, error: eErr } = await supabase
    .from('consultant_targets')
    .select('consultant_id, target_type')
    .eq('period_start', destMonthStart);

  if (eErr) return { error: eErr.message };

  const existingKeys = new Set(
    (existingTargets ?? []).map((t) => `${t.consultant_id}:${t.target_type}`)
  );

  // Build upserts for targets not already set in dest month
  const destDate = new Date(destMonthStart + 'T00:00:00');
  const destEnd = getMonthEnd(destDate);

  const newTargets: UpsertTargetInput[] = sourceTargets
    .filter((t) => !existingKeys.has(`${t.consultant_id}:${t.target_type}`))
    .map((t) => ({
      consultant_id: t.consultant_id,
      target_type: t.target_type,
      target_value: Number(t.target_value),
      period_start: destMonthStart,
      period_end: destEnd,
    }));

  if (newTargets.length === 0) {
    return { data: { count: 0 } };
  }

  // Use the same RPC for consistency
  const { data: count, error } = await supabase.rpc('upsert_monthly_targets', {
    p_targets: newTargets,
    p_created_by: userId,
  });

  if (error) return { error: error.message };

  await writeAuditLog(
    'target.copy_month',
    'consultant_targets',
    undefined,
    null,
    {
      source_month: sourceMonthStart,
      dest_month: destMonthStart,
      count: count ?? newTargets.length,
    }
  );

  return { data: { count: count ?? newTargets.length } };
}

// =============================================================================
// Apply Targets to Multiple Months
// =============================================================================

export async function applyToMonths(
  sourceMonthStart: string,
  destMonths: string[],
  overwrite: boolean
): Promise<ActionResult<{ count: number }>> {
  const userId = await requireAdminOrManager();
  if (!userId) return { error: 'Admin or manager access required' };

  if (destMonths.length === 0) return { error: 'No destination months selected' };

  const supabase = await createClient();

  // Get source month targets
  const { data: sourceTargets, error: sErr } = await supabase
    .from('consultant_targets')
    .select('consultant_id, target_type, target_value')
    .eq('period_start', sourceMonthStart);

  if (sErr) return { error: sErr.message };
  if (!sourceTargets?.length) {
    return { error: 'No targets found in the source month' };
  }

  let totalWritten = 0;

  for (const destMonth of destMonths) {
    const destDate = new Date(destMonth + 'T00:00:00');
    const destEnd = getMonthEnd(destDate);

    let targetsToWrite = sourceTargets;

    if (!overwrite) {
      // Fetch existing targets for this dest month, skip matches
      const { data: existing, error: eErr } = await supabase
        .from('consultant_targets')
        .select('consultant_id, target_type')
        .eq('period_start', destMonth);

      if (eErr) return { error: eErr.message };

      const existingKeys = new Set(
        (existing ?? []).map((t) => `${t.consultant_id}:${t.target_type}`)
      );

      targetsToWrite = sourceTargets.filter(
        (t) => !existingKeys.has(`${t.consultant_id}:${t.target_type}`)
      );
    }

    if (targetsToWrite.length === 0) continue;

    const payload: UpsertTargetInput[] = targetsToWrite.map((t) => ({
      consultant_id: t.consultant_id,
      target_type: t.target_type,
      target_value: Number(t.target_value),
      period_start: destMonth,
      period_end: destEnd,
    }));

    const { data: count, error } = await supabase.rpc('upsert_monthly_targets', {
      p_targets: payload,
      p_created_by: userId,
    });

    if (error) return { error: error.message };
    totalWritten += count ?? payload.length;
  }

  await writeAuditLog(
    'target.apply_to_months',
    'consultant_targets',
    undefined,
    null,
    {
      source_month: sourceMonthStart,
      dest_months: destMonths,
      count: totalWritten,
      overwrite,
    }
  );

  return { data: { count: totalWritten } };
}
