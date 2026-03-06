'use server';

import { createClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/supabase/fetch-all';
import {
  ACTIVE_PIPELINE_STATUSES,
  EXIT_STATUSES,
  PRE_PIPELINE_STATUSES,
  DEFAULT_PROBABILITIES,
  buildStages,
  resolveTeamType,
} from '@/lib/pipeline/constants';
import {
  getMonthStart,
  getMonthEnd,
  formatMonthLabel,
  navigateMonth,
} from '@/lib/targets/month-utils';
import type {
  PipelineData,
  PipelineRow,
  PipelineAverages,
  PipelineDrillDownRow,
  PipelineDrillDownResult,
  ConsultantJobRow,
  ConsultantJobsResult,
  TeamType,
} from '@/lib/pipeline/types';

type ActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function validateMonthStart(v: string): boolean {
  return DATE_RE.test(v) && !isNaN(Date.parse(v));
}
function clampPage(page: number, pageSize: number): { page: number; pageSize: number } {
  return { page: Math.max(1, Math.floor(page)), pageSize: Math.min(200, Math.max(1, Math.floor(pageSize))) };
}

/**
 * Computes permanent placement fee from fee_amount and candidate_salary.
 * fee_amount <= 1 → percentage (e.g. 0.15 = 15%), multiply by salary.
 * fee_amount > 1 → already a dollar amount, use directly.
 */
function calcPermFee(feeAmount: number, candidateSalary: number): number {
  if (feeAmount <= 0) return 0;
  if (feeAmount > 1) return feeAmount; // already dollars
  return feeAmount * candidateSalary;   // percentage × salary
}

function calcContractRevenue(
  gpPerHour: number,
  startDate: string | null,
  endDate: string | null,
  hoursPerDay?: number | null,
  workingDaysPerWeek?: number | null
): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const calendarDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const hpd = hoursPerDay || 8;
  const dpw = workingDaysPerWeek || 0;
  const workingDays = dpw > 0 ? calendarDays * (dpw / 7) : calendarDays;
  return gpPerHour * hpd * workingDays;
}

/**
 * Fetches pipeline data for a given month and optional consultant scope.
 * Returns team-grouped rows with stage counts, dual metrics (revenue + GP/hr),
 * targets, and weighted forecast.
 */
export async function getPipelineData(
  monthStart: string,
  consultantIds: string[] | null
): Promise<ActionResult<PipelineData>> {
  if (!validateMonthStart(monthStart)) return { error: 'Invalid month' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  try {

  const monthDate = new Date(monthStart + 'T00:00:00');
  const monthEnd = getMonthEnd(monthDate);
  const monthLabel = formatMonthLabel(monthDate);

  // Historical window: 6 months back for average revenue calculation
  const histStart = getMonthStart(navigateMonth(monthDate, -6));

  // Fire all queries in parallel
  const [
    rulesRes,
    submissionsRaw,
    placementsRes,
    targetsRes,
    jobOrdersRaw,
    profilesRes,
    hierarchyRes,
    histPlacementsRes,
  ] = await Promise.all([
    // 1. Pipeline probabilities from business_rules
    supabase
      .from('business_rules')
      .select('rule_key, rule_value')
      .eq('rule_type', 'pipeline_probability'),

    // 2. ALL submission_status_log rows (>1000 — paginate)
    fetchAllRows(
      supabase
        .from('submission_status_log')
        .select('bullhorn_submission_id, status_to, detected_at, consultant_id, job_order_id')
    ),

    // 3. Placements for this month (confirmed revenue)
    supabase
      .from('placements')
      .select('consultant_id, job_order_id, revenue_type, fee_amount, candidate_salary, gp_per_hour, start_date, end_date, placement_date, hours_per_day, working_days_per_week')
      .gte('placement_date', monthStart)
      .lte('placement_date', monthEnd),

    // 4. Revenue targets for this month (with metadata for revenue_mode)
    supabase
      .from('consultant_targets')
      .select('consultant_id, target_value, metadata')
      .eq('target_type', 'revenue')
      .eq('period_start', monthStart),

    // 5. Job orders (for employment_type + consultant ownership + active status)
    // >1000 rows — must paginate
    fetchAllRows(
      supabase
        .from('job_orders')
        .select('id, employment_type, consultant_id, date_last_modified, status, pay_rate, bill_rate')
    ),

    // 6. User profiles (include title to filter out non-consulting roles)
    supabase
      .from('user_profiles')
      .select('id, display_name, first_name, last_name, hierarchy_node_id, title'),

    // 7. Org hierarchy
    supabase
      .from('org_hierarchy')
      .select('id, parent_id, name, hierarchy_level'),

    // 8. Historical placements for avg revenue (last 6 months)
    supabase
      .from('placements')
      .select('revenue_type, fee_amount, candidate_salary, gp_per_hour, start_date, end_date, hours_per_day, working_days_per_week')
      .gte('placement_date', histStart)
      .lt('placement_date', monthStart),
  ]);

  if (rulesRes.error) return { error: rulesRes.error.message };
  if (placementsRes.error) return { error: placementsRes.error.message };
  if (targetsRes.error) return { error: targetsRes.error.message };
  if (profilesRes.error) return { error: profilesRes.error.message };
  if (hierarchyRes.error) return { error: hierarchyRes.error.message };
  if (histPlacementsRes.error) return { error: histPlacementsRes.error.message };

  const submissions = submissionsRaw as {
    bullhorn_submission_id: number;
    status_to: string;
    detected_at: string;
    consultant_id: string | null;
    job_order_id: string | null;
  }[];

  // --- Build probability lookup from business_rules ---
  const probabilities: Record<string, number> = { ...DEFAULT_PROBABILITIES };
  for (const rule of rulesRes.data ?? []) {
    const val = rule.rule_value as { probability?: number };
    if (val.probability != null) {
      probabilities[rule.rule_key] = val.probability;
    }
  }
  const stages = buildStages(probabilities);

  // --- Build job order lookups ---
  const jobTypeMap = new Map<string, string>();
  const OPEN_JOB_STATUSES = new Set(['Accepting Candidates', 'Open']);
  const CLOSED_JOB_STATUSES = new Set(['Placed', 'Filled by Client', 'Filled by Competitor', 'Withdrawn', 'Unresponsive Client', 'Low chance of filling', 'No Longer Accepting Candidates']);
  const closedJobIdSet = new Set<string>(); // jobs with terminal status — not active pipeline
  const openJobsByConsultant = new Map<string, Set<string>>(); // consultant → open job UUIDs
  const jobGpPerHourMap = new Map<string, number>(); // job UUID → GP/hr from bill_rate - pay_rate
  const jobOrders = jobOrdersRaw as { id: string; employment_type: string | null; consultant_id: string | null; date_last_modified: string | null; status: string | null; pay_rate: number | null; bill_rate: number | null }[];
  for (const jo of jobOrders) {
    if (jo.employment_type) jobTypeMap.set(jo.id, jo.employment_type);
    if (jo.status && CLOSED_JOB_STATUSES.has(jo.status)) closedJobIdSet.add(jo.id);
    // Build per-job GP/hr from actual rates (bill_rate - pay_rate)
    if (jo.bill_rate != null && jo.pay_rate != null && jo.bill_rate > 0 && jo.pay_rate > 0) {
      const gphr = jo.bill_rate - jo.pay_rate;
      if (gphr > 0) jobGpPerHourMap.set(jo.id, gphr);
    }
    // Track jobs with open/accepting status per consultant
    if (jo.consultant_id) {
      if (jo.status && OPEN_JOB_STATUSES.has(jo.status)) {
        if (!openJobsByConsultant.has(jo.consultant_id)) {
          openJobsByConsultant.set(jo.consultant_id, new Set());
        }
        openJobsByConsultant.get(jo.consultant_id)!.add(jo.id);
      }
    }
  }

  // --- Calculate historical averages ---
  let permFeeSum = 0, permCount = 0, contractGpSum = 0, contractCount = 0;
  let gpPerHourRateSum = 0, gpPerHourRateCount = 0;
  for (const p of histPlacementsRes.data ?? []) {
    if (p.revenue_type === 'permanent') {
      const fee = calcPermFee(Number(p.fee_amount) || 0, Number(p.candidate_salary) || 0);
      if (fee > 0) { permFeeSum += fee; permCount++; }
    } else {
      const gp = Number(p.gp_per_hour) || 0;
      if (gp > 0) {
        contractGpSum += calcContractRevenue(gp, p.start_date, p.end_date, p.hours_per_day, p.working_days_per_week);
        contractCount++;
        gpPerHourRateSum += gp;
        gpPerHourRateCount++;
      }
    }
  }
  const avgPermFee = permCount > 0 ? permFeeSum / permCount : 15000;
  const avgContractGp = contractCount > 0 ? contractGpSum / contractCount : 20000;
  const avgGpPerHourRate = gpPerHourRateCount > 0 ? gpPerHourRateSum / gpPerHourRateCount : 25;
  const averages: PipelineAverages = { avgPermFee, avgContractGp, avgGpPerHourRate, permCount, contractCount };

  // --- Deduplicate submissions → current status per submission ---
  const latestBySubmission = new Map<number, {
    status: string;
    consultantId: string | null;
    jobOrderId: string | null;
    detectedAt: string;
  }>();

  for (const s of submissions) {
    const existing = latestBySubmission.get(s.bullhorn_submission_id);
    if (!existing || s.detected_at > existing.detectedAt) {
      latestBySubmission.set(s.bullhorn_submission_id, {
        status: s.status_to,
        consultantId: s.consultant_id,
        jobOrderId: s.job_order_id,
        detectedAt: s.detected_at,
      });
    }
  }

  // Active pipeline statuses (exclude Placed — counted via placements table)
  const activePipelineSet = new Set<string>(ACTIVE_PIPELINE_STATUSES.filter((s) => s !== 'Placed'));

  // Filter to active pipeline submissions, optionally scoped by consultant
  const consultantIdSet = consultantIds ? new Set(consultantIds) : null;

  // Per-consultant: { stageCounts, weightedRevenue, weightedGpPerHour, jobOrderIds }
  const consultantPipeline = new Map<string, {
    stageCounts: Record<string, number>;
    weightedRevenue: number;
    weightedGpPerHour: number;
    jobOrderIds: Set<string>;
  }>();

  for (const [, sub] of latestBySubmission) {
    // Must be in an active pipeline stage
    if (!activePipelineSet.has(sub.status)) continue;
    // Must be exit-free
    if (EXIT_STATUSES.has(sub.status) || PRE_PIPELINE_STATUSES.has(sub.status)) continue;
    // Skip submissions on closed jobs — stale submission data on filled/withdrawn roles
    if (sub.jobOrderId && closedJobIdSet.has(sub.jobOrderId)) continue;
    // Consultant filter
    if (!sub.consultantId) continue;
    if (consultantIdSet && !consultantIdSet.has(sub.consultantId)) continue;

    // Initialize consultant entry
    if (!consultantPipeline.has(sub.consultantId)) {
      consultantPipeline.set(sub.consultantId, { stageCounts: {}, weightedRevenue: 0, weightedGpPerHour: 0, jobOrderIds: new Set() });
    }
    const entry = consultantPipeline.get(sub.consultantId)!;

    // Track unique job order
    if (sub.jobOrderId) entry.jobOrderIds.add(sub.jobOrderId);

    // Increment stage count
    entry.stageCounts[sub.status] = (entry.stageCounts[sub.status] ?? 0) + 1;

    // Estimate revenue and apply probability weight — dual accumulators
    const empType = sub.jobOrderId ? jobTypeMap.get(sub.jobOrderId) : null;
    const probability = probabilities[sub.status] ?? 0;

    if (empType === 'Contract') {
      // Use actual job GP/hr (bill_rate - pay_rate) when available, fall back to historical average
      const jobGphr = sub.jobOrderId ? jobGpPerHourMap.get(sub.jobOrderId) : undefined;
      entry.weightedGpPerHour += (jobGphr ?? avgGpPerHourRate) * probability;
    } else {
      entry.weightedRevenue += avgPermFee * probability;
    }
  }

  // --- Build confirmed revenue/GP by consultant (this month's placements) ---
  const confirmedRevenue = new Map<string, number>();
  const confirmedGpPerHour = new Map<string, number>();
  const confirmedCounts = new Map<string, number>();
  const placedJobsByConsultant = new Map<string, Set<string>>(); // consultant → job UUIDs placed this month
  for (const p of placementsRes.data ?? []) {
    if (!p.consultant_id) continue;
    if (consultantIdSet && !consultantIdSet.has(p.consultant_id)) continue;

    if (p.revenue_type === 'permanent') {
      const amount = calcPermFee(Number(p.fee_amount) || 0, Number(p.candidate_salary) || 0);
      confirmedRevenue.set(p.consultant_id, (confirmedRevenue.get(p.consultant_id) ?? 0) + amount);
    } else {
      const gph = Number(p.gp_per_hour) || 0;
      confirmedGpPerHour.set(p.consultant_id, (confirmedGpPerHour.get(p.consultant_id) ?? 0) + gph);
    }
    confirmedCounts.set(p.consultant_id, (confirmedCounts.get(p.consultant_id) ?? 0) + 1);

    // Track placed jobs this month
    if (p.job_order_id) {
      if (!placedJobsByConsultant.has(p.consultant_id)) {
        placedJobsByConsultant.set(p.consultant_id, new Set());
      }
      placedJobsByConsultant.get(p.consultant_id)!.add(p.job_order_id);
    }
  }

  // --- Build target lookups by revenue_mode ---
  const dollarTargets = new Map<string, number>();
  const gpPerHourTargets = new Map<string, number>();
  for (const t of targetsRes.data ?? []) {
    const meta = t.metadata as { revenue_mode?: string } | null;
    const mode = meta?.revenue_mode ?? 'dollar';
    if (mode === 'gp_per_hour') {
      gpPerHourTargets.set(t.consultant_id, Number(t.target_value));
    } else {
      dollarTargets.set(t.consultant_id, Number(t.target_value));
    }
  }

  // --- Build profile lookups ---
  // Talent management titles excluded from pipeline (non-consulting roles)
  const TALENT_MGMT_TITLES = new Set(['talent_manager', 'senior_talent_manager', 'talent_delivery_lead']);
  const profileMap = new Map<string, {
    name: string;
    hierarchyNodeId: string | null;
    isTalentMgmt: boolean;
  }>();
  for (const p of profilesRes.data ?? []) {
    const name =
      p.display_name ||
      [p.first_name, p.last_name].filter(Boolean).join(' ') ||
      'Unknown';
    profileMap.set(p.id, {
      name,
      hierarchyNodeId: p.hierarchy_node_id,
      isTalentMgmt: TALENT_MGMT_TITLES.has(p.title ?? ''),
    });
  }

  // --- Build hierarchy lookup ---
  const hierMap = new Map<string, { parentId: string | null; name: string; level: string }>();
  for (const h of hierarchyRes.data ?? []) {
    hierMap.set(h.id, { parentId: h.parent_id, name: h.name, level: h.hierarchy_level });
  }

  // --- Assemble consultant-level rows ---
  const allConsultantIds = new Set<string>();
  // When specific consultants are scoped, always include them (even with no data)
  if (consultantIds) {
    for (const id of consultantIds) allConsultantIds.add(id);
  }
  for (const id of consultantPipeline.keys()) allConsultantIds.add(id);
  for (const id of confirmedRevenue.keys()) allConsultantIds.add(id);
  for (const id of confirmedGpPerHour.keys()) allConsultantIds.add(id);
  for (const id of dollarTargets.keys()) {
    if (!consultantIdSet || consultantIdSet.has(id)) allConsultantIds.add(id);
  }
  for (const id of gpPerHourTargets.keys()) {
    if (!consultantIdSet || consultantIdSet.has(id)) allConsultantIds.add(id);
  }
  // Also include consultants with open jobs or placed jobs this month
  for (const id of openJobsByConsultant.keys()) {
    if (!consultantIdSet || consultantIdSet.has(id)) allConsultantIds.add(id);
  }
  for (const id of placedJobsByConsultant.keys()) {
    if (!consultantIdSet || consultantIdSet.has(id)) allConsultantIds.add(id);
  }

  const consultantRows: PipelineRow[] = [];
  for (const cid of allConsultantIds) {
    const profile = profileMap.get(cid);
    // Skip talent management roles — only consulting roles in pipeline
    if (profile?.isTalentMgmt) continue;
    const pipeline = consultantPipeline.get(cid);
    const placedCount = confirmedCounts.get(cid) ?? 0;

    // Perm metrics
    const cRevenue = confirmedRevenue.get(cid) ?? 0;
    const wRevenue = pipeline?.weightedRevenue ?? 0;
    const dTarget = dollarTargets.get(cid) ?? null;
    const totalRev = cRevenue + wRevenue;
    const revGap = dTarget !== null ? dTarget - totalRev : null;
    const revPct = dTarget !== null && dTarget > 0 ? Math.round((totalRev / dTarget) * 100) : null;

    // Contract metrics
    const cGphr = confirmedGpPerHour.get(cid) ?? 0;
    const wGphr = pipeline?.weightedGpPerHour ?? 0;
    const gTarget = gpPerHourTargets.get(cid) ?? null;
    const totalGphr = cGphr + wGphr;
    const gpGap = gTarget !== null ? gTarget - totalGphr : null;
    const gpPct = gTarget !== null && gTarget > 0 ? Math.round((totalGphr / gTarget) * 100) : null;

    // Placed count in stageCounts for display
    const stageCounts = { ...(pipeline?.stageCounts ?? {}) };
    if (placedCount > 0) stageCounts['Placed'] = placedCount;

    // Resolve teamType from hierarchy node name
    const nodeId = profile?.hierarchyNodeId;
    const hier = nodeId ? hierMap.get(nodeId) : null;
    const teamType = hier ? resolveTeamType(hier.name) : 'permanent';

    // Job counts: open/accepting jobs + jobs with active submissions + jobs placed this month
    const acceptingJobIds = openJobsByConsultant.get(cid) ?? new Set<string>();
    const pipelineJobIds = pipeline?.jobOrderIds ?? new Set<string>();
    const placedJobIds = placedJobsByConsultant.get(cid) ?? new Set<string>();
    const allPipelineJobs = new Set([...acceptingJobIds, ...pipelineJobIds, ...placedJobIds]);
    const openJobs = allPipelineJobs.size;
    const jobsWithSubs = pipelineJobIds.size;
    const jobsWithoutSubs = Math.max(0, acceptingJobIds.size - jobsWithSubs);

    consultantRows.push({
      id: cid,
      name: profile?.name ?? 'Unknown',
      type: 'consultant',
      teamType,
      stageCounts,
      confirmedRevenue: cRevenue,
      weightedPipelineRevenue: wRevenue,
      target: dTarget,
      gap: revGap,
      percentToTarget: revPct,
      confirmedGpPerHour: cGphr,
      weightedGpPerHour: wGphr,
      gpPerHourTarget: gTarget,
      gpPerHourGap: gpGap,
      gpPerHourPercentToTarget: gpPct,
      openJobs,
      jobsWithSubmissions: jobsWithSubs,
      jobsWithoutSubmissions: jobsWithoutSubs,
    });
  }

  // --- Group into teams ---
  const teamGroups = new Map<string, PipelineRow[]>();
  const unassigned: PipelineRow[] = [];

  for (const row of consultantRows) {
    const profile = profileMap.get(row.id);
    const nodeId = profile?.hierarchyNodeId;
    if (nodeId) {
      if (!teamGroups.has(nodeId)) teamGroups.set(nodeId, []);
      teamGroups.get(nodeId)!.push(row);
    } else {
      unassigned.push(row);
    }
  }

  // Build team-level rows by aggregating children
  const teamRows: PipelineRow[] = [];
  for (const [nodeId, children] of teamGroups) {
    const hier = hierMap.get(nodeId);
    const teamName = hier?.name ?? 'Unknown Team';
    const teamType = resolveTeamType(teamName);

    // Sort children by relevant % to target desc (null = last)
    if (teamType === 'contract') {
      children.sort((a, b) => (b.gpPerHourPercentToTarget ?? -1) - (a.gpPerHourPercentToTarget ?? -1));
    } else {
      children.sort((a, b) => (b.percentToTarget ?? -1) - (a.percentToTarget ?? -1));
    }

    // Aggregate
    const stageCounts: Record<string, number> = {};
    let aConfRev = 0, aWeightRev = 0, aDollarTarget = 0;
    let aConfGphr = 0, aWeightGphr = 0, aGphrTarget = 0;
    let hasDollarTarget = false, hasGphrTarget = false;
    let aOpenJobs = 0, aJobsWithSubs = 0, aJobsWithoutSubs = 0;
    for (const child of children) {
      for (const [status, count] of Object.entries(child.stageCounts)) {
        stageCounts[status] = (stageCounts[status] ?? 0) + count;
      }
      aConfRev += child.confirmedRevenue;
      aWeightRev += child.weightedPipelineRevenue;
      aConfGphr += child.confirmedGpPerHour;
      aWeightGphr += child.weightedGpPerHour;
      if (child.target !== null) { aDollarTarget += child.target; hasDollarTarget = true; }
      if (child.gpPerHourTarget !== null) { aGphrTarget += child.gpPerHourTarget; hasGphrTarget = true; }
      aOpenJobs += child.openJobs;
      aJobsWithSubs += child.jobsWithSubmissions;
      aJobsWithoutSubs += child.jobsWithoutSubmissions;
    }

    const dTarget = hasDollarTarget ? aDollarTarget : null;
    const gTarget = hasGphrTarget ? aGphrTarget : null;
    const totalRev = aConfRev + aWeightRev;
    const totalGphr = aConfGphr + aWeightGphr;

    teamRows.push({
      id: nodeId,
      name: teamName,
      type: 'team',
      teamType,
      stageCounts,
      confirmedRevenue: aConfRev,
      weightedPipelineRevenue: aWeightRev,
      target: dTarget,
      gap: dTarget !== null ? dTarget - totalRev : null,
      percentToTarget: dTarget !== null && dTarget > 0 ? Math.round((totalRev / dTarget) * 100) : null,
      confirmedGpPerHour: aConfGphr,
      weightedGpPerHour: aWeightGphr,
      gpPerHourTarget: gTarget,
      gpPerHourGap: gTarget !== null ? gTarget - totalGphr : null,
      gpPerHourPercentToTarget: gTarget !== null && gTarget > 0 ? Math.round((totalGphr / gTarget) * 100) : null,
      openJobs: aOpenJobs,
      jobsWithSubmissions: aJobsWithSubs,
      jobsWithoutSubmissions: aJobsWithoutSubs,
      children,
    });
  }

  // Add unassigned as a virtual team if any
  if (unassigned.length > 0) {
    const stageCounts: Record<string, number> = {};
    let aConfRev = 0, aWeightRev = 0, aDollarTarget = 0;
    let aConfGphr = 0, aWeightGphr = 0, aGphrTarget = 0;
    let hasDollarTarget = false, hasGphrTarget = false;
    let aOpenJobs = 0, aJobsWithSubs = 0, aJobsWithoutSubs = 0;
    for (const child of unassigned) {
      for (const [status, count] of Object.entries(child.stageCounts)) {
        stageCounts[status] = (stageCounts[status] ?? 0) + count;
      }
      aConfRev += child.confirmedRevenue;
      aWeightRev += child.weightedPipelineRevenue;
      aConfGphr += child.confirmedGpPerHour;
      aWeightGphr += child.weightedGpPerHour;
      if (child.target !== null) { aDollarTarget += child.target; hasDollarTarget = true; }
      if (child.gpPerHourTarget !== null) { aGphrTarget += child.gpPerHourTarget; hasGphrTarget = true; }
      aOpenJobs += child.openJobs;
      aJobsWithSubs += child.jobsWithSubmissions;
      aJobsWithoutSubs += child.jobsWithoutSubmissions;
    }
    const dTarget = hasDollarTarget ? aDollarTarget : null;
    const gTarget = hasGphrTarget ? aGphrTarget : null;
    const totalRev = aConfRev + aWeightRev;
    const totalGphr = aConfGphr + aWeightGphr;
    teamRows.push({
      id: 'unassigned',
      name: 'Unassigned',
      type: 'team',
      teamType: 'permanent',
      stageCounts,
      confirmedRevenue: aConfRev,
      weightedPipelineRevenue: aWeightRev,
      target: dTarget,
      gap: dTarget !== null ? dTarget - totalRev : null,
      percentToTarget: dTarget !== null && dTarget > 0 ? Math.round((totalRev / dTarget) * 100) : null,
      confirmedGpPerHour: aConfGphr,
      weightedGpPerHour: aWeightGphr,
      gpPerHourTarget: gTarget,
      gpPerHourGap: gTarget !== null ? gTarget - totalGphr : null,
      gpPerHourPercentToTarget: gTarget !== null && gTarget > 0 ? Math.round((totalGphr / gTarget) * 100) : null,
      openJobs: aOpenJobs,
      jobsWithSubmissions: aJobsWithSubs,
      jobsWithoutSubmissions: aJobsWithoutSubs,
      children: unassigned,
    });
  }

  // Sort teams by name
  teamRows.sort((a, b) => a.name.localeCompare(b.name));

  return {
    data: {
      rows: teamRows,
      stages,
      averages,
      monthLabel,
    },
  };

  } catch (err) {
    console.error('[Pipeline] UNCAUGHT ERROR:', err);
    return { error: 'An unexpected error occurred loading pipeline data' };
  }
}

/**
 * Fetches drill-down data for a pipeline stage.
 * Returns enriched submission/placement rows with JOINed names.
 */
export async function getPipelineDrillDown(
  consultantIds: string[],
  status: string,
  monthStart: string,
  teamType: TeamType,
  page: number = 1,
  pageSize: number = 25
): Promise<ActionResult<PipelineDrillDownResult>> {
  if (!validateMonthStart(monthStart)) return { error: 'Invalid month' };
  ({ page, pageSize } = clampPage(page, pageSize));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const monthDate = new Date(monthStart + 'T00:00:00');
  const monthEnd = getMonthEnd(monthDate);

  // Load probabilities for stage probability display
  const { data: rulesData } = await supabase
    .from('business_rules')
    .select('rule_key, rule_value')
    .eq('rule_type', 'pipeline_probability');

  const probabilities: Record<string, number> = { ...DEFAULT_PROBABILITIES };
  for (const rule of rulesData ?? []) {
    const val = rule.rule_value as { probability?: number };
    if (val.probability != null) {
      probabilities[rule.rule_key] = val.probability;
    }
  }

  // Load historical averages for value estimation
  const histStart = getMonthStart(navigateMonth(monthDate, -6));
  const { data: histPlacements } = await supabase
    .from('placements')
    .select('revenue_type, fee_amount, candidate_salary, gp_per_hour, start_date, end_date')
    .gte('placement_date', histStart)
    .lt('placement_date', monthStart);

  let permFeeSum = 0, permCount = 0, gphrSum = 0, gphrCount = 0;
  for (const p of histPlacements ?? []) {
    if (p.revenue_type === 'permanent') {
      const fee = calcPermFee(Number(p.fee_amount) || 0, Number(p.candidate_salary) || 0);
      if (fee > 0) { permFeeSum += fee; permCount++; }
    } else {
      const gp = Number(p.gp_per_hour) || 0;
      if (gp > 0) { gphrSum += gp; gphrCount++; }
    }
  }
  const avgPermFee = permCount > 0 ? permFeeSum / permCount : 15000;
  const avgGpPerHourRate = gphrCount > 0 ? gphrSum / gphrCount : 25;

  // For "Placed" stage, query placements table directly
  if (status === 'Placed') {
    return fetchPlacedDrillDown(
      supabase, consultantIds, monthStart, monthEnd, teamType, page, pageSize
    );
  }

  // 1. Fetch all submission_status_log for these consultants
  const allSubs = await fetchAllRows(
    supabase
      .from('submission_status_log')
      .select('id, bullhorn_submission_id, status_to, detected_at, consultant_id, job_order_id, candidate_id')
      .in('consultant_id', consultantIds)
  ) as {
    id: string;
    bullhorn_submission_id: number;
    status_to: string;
    detected_at: string;
    consultant_id: string | null;
    job_order_id: string | null;
    candidate_id: string | null;
  }[];

  // 2. Deduplicate to latest status per bullhorn_submission_id
  const latestMap = new Map<number, typeof allSubs[0]>();
  for (const s of allSubs) {
    const existing = latestMap.get(s.bullhorn_submission_id);
    if (!existing || s.detected_at > existing.detected_at) {
      latestMap.set(s.bullhorn_submission_id, s);
    }
  }

  // 3. Filter to those matching requested status
  const matching = Array.from(latestMap.values()).filter((s) => s.status_to === status);
  const totalRows = matching.length;

  // 4. Paginate
  const startIdx = (page - 1) * pageSize;
  const pageItems = matching
    .sort((a, b) => b.detected_at.localeCompare(a.detected_at))
    .slice(startIdx, startIdx + pageSize);

  if (pageItems.length === 0) {
    return { data: { rows: [], totalRows } };
  }

  // 5. Fetch enriched data for these submissions via JOINs
  const subIds = pageItems.map((s) => s.id);
  const { data: enriched, error: eErr } = await supabase
    .from('submission_status_log')
    .select(`
      id, bullhorn_submission_id, status_to, detected_at, consultant_id, candidate_id, job_order_id,
      user_profiles(display_name),
      candidates(first_name, last_name),
      job_orders(title, employment_type, pay_rate, bill_rate, client_corporations(name))
    `)
    .in('id', subIds);

  if (eErr) return { error: eErr.message };

  // 6. Build result rows
  const rows: PipelineDrillDownRow[] = (enriched ?? []).map((r) => {
    const profile = Array.isArray(r.user_profiles)
      ? (r.user_profiles as Record<string, unknown>[])[0]
      : r.user_profiles as Record<string, unknown> | null;
    const candidate = Array.isArray(r.candidates)
      ? (r.candidates as Record<string, unknown>[])[0]
      : r.candidates as Record<string, unknown> | null;
    const jobOrder = Array.isArray(r.job_orders)
      ? (r.job_orders as Record<string, unknown>[])[0]
      : r.job_orders as Record<string, unknown> | null;
    const clientCorp = jobOrder
      ? (Array.isArray(jobOrder.client_corporations)
          ? (jobOrder.client_corporations as Record<string, unknown>[])[0]
          : jobOrder.client_corporations as Record<string, unknown> | null)
      : null;

    const empType = (jobOrder?.employment_type as string) ?? 'Permanent';
    const probability = probabilities[r.status_to] ?? 0;
    const isContract = empType === 'Contract';
    // Use actual job GP/hr (bill_rate - pay_rate) when available
    let value: number;
    if (isContract) {
      const billRate = Number(jobOrder?.bill_rate) || 0;
      const payRate = Number(jobOrder?.pay_rate) || 0;
      value = (billRate > 0 && payRate > 0) ? billRate - payRate : avgGpPerHourRate;
    } else {
      value = avgPermFee;
    }
    const weightedValue = value * probability;

    return {
      id: r.id,
      statusDate: r.detected_at,
      jobTitle: (jobOrder?.title as string) ?? 'Unknown',
      companyName: (clientCorp?.name as string) ?? 'Unknown',
      candidateName: [candidate?.first_name, candidate?.last_name].filter(Boolean).join(' ') || 'Unknown',
      stage: r.status_to,
      employmentType: empType,
      value,
      probability,
      weightedValue,
      consultantName: (profile?.display_name as string) ?? 'Unknown',
    };
  });

  // Sort by date desc
  rows.sort((a, b) => b.statusDate.localeCompare(a.statusDate));

  return { data: { rows, totalRows } };
}

/**
 * Fetches placed (confirmed) drill-down from placements table.
 */
async function fetchPlacedDrillDown(
  supabase: Awaited<ReturnType<typeof createClient>>,
  consultantIds: string[],
  monthStart: string,
  monthEnd: string,
  teamType: TeamType,
  page: number,
  pageSize: number
): Promise<ActionResult<PipelineDrillDownResult>> {
  // Count total
  const { count, error: cErr } = await supabase
    .from('placements')
    .select('id', { count: 'exact', head: true })
    .in('consultant_id', consultantIds)
    .gte('placement_date', monthStart)
    .lte('placement_date', monthEnd);

  if (cErr) return { error: cErr.message };

  const totalRows = count ?? 0;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from('placements')
    .select(`
      id, placement_date, revenue_type, fee_amount, candidate_salary, gp_per_hour, consultant_id, candidate_id,
      user_profiles(display_name),
      candidates(first_name, last_name),
      job_orders(title, employment_type, client_corporations(name))
    `)
    .in('consultant_id', consultantIds)
    .gte('placement_date', monthStart)
    .lte('placement_date', monthEnd)
    .order('placement_date', { ascending: false })
    .range(from, to);

  if (error) return { error: error.message };

  const rows: PipelineDrillDownRow[] = (data ?? []).map((r) => {
    const profile = Array.isArray(r.user_profiles)
      ? (r.user_profiles as Record<string, unknown>[])[0]
      : r.user_profiles as Record<string, unknown> | null;
    const candidate = Array.isArray(r.candidates)
      ? (r.candidates as Record<string, unknown>[])[0]
      : r.candidates as Record<string, unknown> | null;
    const jobOrder = Array.isArray(r.job_orders)
      ? (r.job_orders as Record<string, unknown>[])[0]
      : r.job_orders as Record<string, unknown> | null;
    const clientCorp = jobOrder
      ? (Array.isArray(jobOrder.client_corporations)
          ? (jobOrder.client_corporations as Record<string, unknown>[])[0]
          : jobOrder.client_corporations as Record<string, unknown> | null)
      : null;

    const isPerm = r.revenue_type === 'permanent';
    const value = isPerm
      ? calcPermFee(Number(r.fee_amount) || 0, Number(r.candidate_salary) || 0)
      : (Number(r.gp_per_hour) || 0);

    return {
      id: r.id,
      statusDate: r.placement_date,
      jobTitle: (jobOrder?.title as string) ?? 'Unknown',
      companyName: (clientCorp?.name as string) ?? 'Unknown',
      candidateName: [candidate?.first_name, candidate?.last_name].filter(Boolean).join(' ') || 'Unknown',
      stage: 'Placed',
      employmentType: (jobOrder?.employment_type as string) ?? (isPerm ? 'Permanent' : 'Contract'),
      value,
      probability: 1.0,
      weightedValue: value,
      consultantName: (profile?.display_name as string) ?? 'Unknown',
    };
  });

  return { data: { rows, totalRows } };
}

/**
 * Fetches open job orders for a consultant, enriched with company name
 * and active pipeline submission counts per job.
 */
export async function getConsultantJobs(
  consultantId: string,
  monthStart: string,
  page: number = 1,
  pageSize: number = 50
): Promise<ActionResult<ConsultantJobsResult>> {
  if (!validateMonthStart(monthStart)) return { error: 'Invalid month' };
  ({ page, pageSize } = clampPage(page, pageSize));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const monthDate = new Date(monthStart + 'T00:00:00');
  const monthEnd = getMonthEnd(monthDate);

  // 1. Fetch ALL job orders for this consultant (we'll filter to pipeline-relevant below)
  const OPEN_STATUSES = new Set(['Accepting Candidates', 'Open']);
  const [jobsRes, placementsRes] = await Promise.all([
    supabase
      .from('job_orders')
      .select(`
        id, title, employment_type, status, date_added, date_last_modified,
        pay_rate, bill_rate,
        client_corporations(name)
      `)
      .eq('consultant_id', consultantId)
      .order('date_last_modified', { ascending: false }),
    // Placements this month by this consultant (with actual rates)
    supabase
      .from('placements')
      .select('job_order_id, revenue_type, fee_amount, candidate_salary, gp_per_hour')
      .eq('consultant_id', consultantId)
      .gte('placement_date', monthStart)
      .lte('placement_date', monthEnd),
  ]);

  if (jobsRes.error) return { error: jobsRes.error.message };
  const jobs = jobsRes.data ?? [];
  if (jobs.length === 0) {
    return { data: { rows: [], totalRows: 0 } };
  }

  // Build placed job IDs + actual placement rates (locked-in after negotiation)
  const placedJobIds = new Set<string>();
  const placementGpPerHour = new Map<string, number>(); // job UUID → actual GP/hr from placement
  const placementFee = new Map<string, number>(); // job UUID → actual fee from placement
  for (const p of placementsRes.data ?? []) {
    if (!p.job_order_id) continue;
    placedJobIds.add(p.job_order_id);
    if (p.revenue_type === 'contract') {
      const gph = Number(p.gp_per_hour) || 0;
      if (gph > 0) placementGpPerHour.set(p.job_order_id, gph);
    } else {
      const fee = calcPermFee(Number(p.fee_amount) || 0, Number(p.candidate_salary) || 0);
      if (fee > 0) placementFee.set(p.job_order_id, fee);
    }
  }

  const jobIds = jobs.map((j) => j.id);

  // 2. Fetch ALL submissions for these jobs (from any consultant — for display counts)
  const allSubs = await fetchAllRows(
    supabase
      .from('submission_status_log')
      .select('bullhorn_submission_id, status_to, detected_at, job_order_id, consultant_id')
      .in('job_order_id', jobIds)
  ) as {
    bullhorn_submission_id: number;
    status_to: string;
    detected_at: string;
    job_order_id: string | null;
    consultant_id: string | null;
  }[];

  // Deduplicate to latest status per submission
  const latestBySubmission = new Map<number, { status: string; jobOrderId: string | null; detectedAt: string; consultantId: string | null }>();
  for (const s of allSubs) {
    const existing = latestBySubmission.get(s.bullhorn_submission_id);
    if (!existing || s.detected_at > existing.detectedAt) {
      latestBySubmission.set(s.bullhorn_submission_id, {
        status: s.status_to,
        jobOrderId: s.job_order_id,
        detectedAt: s.detected_at,
        consultantId: s.consultant_id,
      });
    }
  }

  // Jobs with terminal status — only qualify for drill-down via placements table (this month)
  const CLOSED_JOB_STATUSES = new Set(['Placed', 'Filled by Client', 'Filled by Competitor', 'Withdrawn', 'Unresponsive Client', 'Low chance of filling', 'No Longer Accepting Candidates']);
  const closedJobIds = new Set<string>();
  for (const j of jobs) {
    if (j.status && CLOSED_JOB_STATUSES.has(j.status)) closedJobIds.add(j.id);
  }

  // Exclude "Placed" — placed jobs are tracked via placements table for the month
  const activePipelineSet = new Set<string>(ACTIVE_PIPELINE_STATUSES.filter((s) => s !== 'Placed'));
  const stageOrder = new Map<string, number>(ACTIVE_PIPELINE_STATUSES.map((s, i) => [s, i]));

  // Track two things separately:
  // a) Which jobs qualify for the drill-down (this consultant's own subs only — matches pipeline logic)
  // b) Display counts per job (all consultants' subs — for sub count and highest stage display)
  const jobsQualifiedBySubs = new Set<string>(); // for filtering (consultant's own subs)
  const jobSubCounts = new Map<string, number>(); // for display (all subs)
  const jobHighestStage = new Map<string, string>(); // for display (all subs)

  for (const [, sub] of latestBySubmission) {
    if (!sub.jobOrderId || !activePipelineSet.has(sub.status)) continue;
    if (EXIT_STATUSES.has(sub.status) || PRE_PIPELINE_STATUSES.has(sub.status)) continue;

    // Display: count all active subs and track highest stage
    jobSubCounts.set(sub.jobOrderId, (jobSubCounts.get(sub.jobOrderId) ?? 0) + 1);
    const currentHighest = jobHighestStage.get(sub.jobOrderId);
    const currentOrder = currentHighest ? (stageOrder.get(currentHighest) ?? -1) : -1;
    const newOrder = stageOrder.get(sub.status) ?? -1;
    if (newOrder > currentOrder) {
      jobHighestStage.set(sub.jobOrderId, sub.status);
    }

    // Qualification: only this consultant's subs determine if job is in the pipeline
    // But skip closed jobs — those only qualify via placements table for this month
    if (sub.consultantId === consultantId && !closedJobIds.has(sub.jobOrderId)) {
      jobsQualifiedBySubs.add(sub.jobOrderId);
    }
  }

  // Mark placed-this-month jobs with "Placed" as highest stage
  for (const jobId of placedJobIds) {
    if (!jobHighestStage.has(jobId)) {
      jobHighestStage.set(jobId, 'Placed');
    }
  }

  // 3. Filter to pipeline-relevant jobs (matching pipeline table logic):
  //    - Open/Accepting Candidates status, OR
  //    - This consultant has active pipeline submissions (excluding Placed), OR
  //    - Was placed this month
  const pipelineJobs = jobs.filter((j) =>
    OPEN_STATUSES.has(j.status ?? '') ||
    jobsQualifiedBySubs.has(j.id) ||
    placedJobIds.has(j.id)
  );

  // 4. Build result rows
  const totalRows = pipelineJobs.length;
  const startIdx = (page - 1) * pageSize;
  const pageJobs = pipelineJobs.slice(startIdx, startIdx + pageSize);

  const rows: ConsultantJobRow[] = pageJobs.map((j) => {
    const clientCorp = Array.isArray(j.client_corporations)
      ? (j.client_corporations as Record<string, unknown>[])[0]
      : j.client_corporations as Record<string, unknown> | null;

    // GP/hr: use placement actuals for placed jobs, otherwise job order estimate
    let gpPerHour: number | null = null;
    if (placementGpPerHour.has(j.id)) {
      gpPerHour = placementGpPerHour.get(j.id)!;
    } else {
      const billRate = Number(j.bill_rate) || 0;
      const payRate = Number(j.pay_rate) || 0;
      gpPerHour = (billRate > 0 && payRate > 0) ? billRate - payRate : null;
    }

    // Fee: use placement actuals for placed perm jobs
    const fee = placementFee.get(j.id) ?? null;

    return {
      id: j.id,
      title: j.title ?? 'Untitled',
      companyName: (clientCorp?.name as string) ?? 'Unknown',
      employmentType: j.employment_type ?? 'Unknown',
      status: j.status,
      dateAdded: j.date_added,
      dateLastModified: j.date_last_modified,
      activeSubs: jobSubCounts.get(j.id) ?? 0,
      highestStage: jobHighestStage.get(j.id) ?? null,
      gpPerHour,
      fee,
    };
  });

  return { data: { rows, totalRows } };
}
