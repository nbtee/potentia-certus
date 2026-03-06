import type { PipelineStage, TeamType } from './types';

/** Ordered pipeline statuses from earliest to latest */
export const ACTIVE_PIPELINE_STATUSES = [
  'Submittal',
  'Client Interview 1',
  'Client Interview 2',
  'Client Interview Final',
  'Offer Extended',
  'Reference',
  'Placed',
] as const;

/** Short column labels for the table header */
export const STAGE_LABELS: Record<string, string> = {
  'Submittal': 'Sub',
  'Client Interview 1': 'CI 1',
  'Client Interview 2': 'CI 2',
  'Client Interview Final': 'CI Final',
  'Offer Extended': 'Offer',
  'Reference': 'Ref',
  'Placed': 'Placed',
};

/** Brand-aligned colors per stage */
export const STAGE_COLORS: Record<string, string> = {
  'Submittal': '#94a3b8',           // slate-400
  'Client Interview 1': '#60a5fa',  // blue-400
  'Client Interview 2': '#38bdf8',  // sky-400
  'Client Interview Final': '#2dd4bf', // teal-400
  'Offer Extended': '#00E5C0',      // brand primary
  'Reference': '#a78bfa',           // violet-400
  'Placed': '#34d399',              // emerald-400
};

/** Fallback probabilities if business_rules haven't loaded */
export const DEFAULT_PROBABILITIES: Record<string, number> = {
  'Submittal': 0.10,
  'Client Interview 1': 0.30,
  'Client Interview 2': 0.50,
  'Client Interview Final': 0.65,
  'Offer Extended': 0.80,
  'Reference': 0.82,
  'Placed': 1.00,
};

/** Statuses that indicate a submission exited the pipeline (rejected/withdrawn) */
export const EXIT_STATUSES = new Set([
  'Rejected',
  'Withdrawn',
  'Client Rejected',
  'Candidate Withdrew',
  'Offer Declined',
  'Placement Failed',
]);

/** Pre-pipeline statuses to exclude from active pipeline */
export const PRE_PIPELINE_STATUSES = new Set([
  'New Lead',
  'Longlisted',
  'Shortlisted',
  'Internal Submittal',
]);

/** Build ordered PipelineStage array from probabilities map */
export function buildStages(probabilities: Record<string, number>): PipelineStage[] {
  return ACTIVE_PIPELINE_STATUSES.map((status) => ({
    status,
    label: STAGE_LABELS[status] ?? status,
    probability: probabilities[status] ?? DEFAULT_PROBABILITIES[status] ?? 0,
    color: STAGE_COLORS[status] ?? '#94a3b8',
  }));
}

/**
 * Resolve team type from org_hierarchy node name.
 * Convention: team names contain "Perm" or "Contract".
 * Leadership / national nodes that match neither are classified as 'leadership'.
 */
export function resolveTeamType(teamName: string): TeamType {
  const lower = teamName.toLowerCase();
  if (lower.includes('perm')) return 'permanent';
  if (lower.includes('contract')) return 'contract';
  return 'leadership';
}

export interface PipelineDrillDownColumn {
  key: string;
  label: string;
  type: 'date' | 'text' | 'currency' | 'rate' | 'percent';
  truncate?: boolean;
}

/** Drill-down column definitions for permanent pipeline */
export const PERM_DRILL_DOWN_COLUMNS: PipelineDrillDownColumn[] = [
  { key: 'statusDate', label: 'Date', type: 'date' },
  { key: 'jobTitle', label: 'Job Title', type: 'text', truncate: true },
  { key: 'companyName', label: 'Company', type: 'text' },
  { key: 'candidateName', label: 'Candidate', type: 'text' },
  { key: 'consultantName', label: 'Consultant', type: 'text' },
  { key: 'stage', label: 'Stage', type: 'text' },
  { key: 'value', label: 'Est. Fee', type: 'currency' },
  { key: 'probability', label: 'Conversion %', type: 'percent' },
];

/** Drill-down column definitions for contract pipeline */
export const CONTRACT_DRILL_DOWN_COLUMNS: PipelineDrillDownColumn[] = [
  { key: 'statusDate', label: 'Date', type: 'date' },
  { key: 'jobTitle', label: 'Job Title', type: 'text', truncate: true },
  { key: 'companyName', label: 'Company', type: 'text' },
  { key: 'candidateName', label: 'Candidate', type: 'text' },
  { key: 'consultantName', label: 'Consultant', type: 'text' },
  { key: 'stage', label: 'Stage', type: 'text' },
  { key: 'value', label: 'GP/hr', type: 'rate' },
  { key: 'probability', label: 'Conversion %', type: 'percent' },
];
