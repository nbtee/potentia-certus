/**
 * Column definitions for the drill-down data table.
 * Keyed by source table name — each entry defines the visible columns.
 *
 * For activities, columns adapt based on whether the asset's activity types
 * are client-facing (BD/AM calls, client meetings) or candidate-facing.
 */

export interface DrillDownColumn {
  key: string;
  label: string;
  type: 'string' | 'date' | 'number' | 'currency';
  /** If true, column content is truncated and expandable */
  truncate?: boolean;
}

/** Activity types that target client contacts rather than candidates */
const CLIENT_ACTIVITY_TYPES = new Set([
  'BD Call',
  'AD Call',
  'AM Call',
  'BD Meeting',
  'Coffee Catch Up - Client',
]);

/**
 * Returns true if the asset's activity types are all client-facing.
 * Mixed assets (e.g. aggregate "Client Touch Points") also qualify.
 */
export function isClientFacingAsset(activityTypes: string[]): boolean {
  if (activityTypes.length === 0) return false;
  return activityTypes.every((t) => CLIENT_ACTIVITY_TYPES.has(t));
}

/** Default activities columns (candidate-facing) */
const candidateActivityColumns: DrillDownColumn[] = [
  { key: 'activity_date', label: 'Date', type: 'date' },
  { key: 'activity_type', label: 'Type', type: 'string' },
  { key: 'consultant_name', label: 'Consultant', type: 'string' },
  { key: 'candidate_name', label: 'Candidate', type: 'string' },
  { key: 'contact_title', label: 'Title', type: 'string' },
  { key: 'job_title', label: 'Job', type: 'string' },
];

/** Client-facing activities columns (BD calls, client meetings, etc.) */
const clientActivityColumns: DrillDownColumn[] = [
  { key: 'activity_date', label: 'Date', type: 'date' },
  { key: 'activity_type', label: 'Type', type: 'string' },
  { key: 'consultant_name', label: 'Consultant', type: 'string' },
  { key: 'candidate_name', label: 'Client Contact', type: 'string' },
  { key: 'contact_title', label: 'Title', type: 'string' },
  { key: 'contact_company', label: 'Company', type: 'string' },
];

/** Get activity columns based on asset's activity types */
export function getActivityColumns(activityTypes: string[]): DrillDownColumn[] {
  return isClientFacingAsset(activityTypes)
    ? clientActivityColumns
    : candidateActivityColumns;
}

export const drillDownColumns: Record<string, DrillDownColumn[]> = {
  activities: candidateActivityColumns,
  job_orders: [
    { key: 'date_added', label: 'Date Added', type: 'date' },
    { key: 'title', label: 'Job Title', type: 'string' },
    { key: 'employment_type', label: 'Type', type: 'string' },
    { key: 'consultant_name', label: 'Consultant', type: 'string' },
    { key: 'client_name', label: 'Client', type: 'string' },
  ],
  placements: [
    { key: 'placement_date', label: 'Placed', type: 'date' },
    { key: 'candidate_name', label: 'Candidate', type: 'string' },
    { key: 'job_title', label: 'Job', type: 'string' },
    { key: 'revenue_type', label: 'Type', type: 'string' },
    { key: 'fee_amount', label: 'Fee/GP', type: 'currency' },
    { key: 'consultant_name', label: 'Consultant', type: 'string' },
  ],
  submission_status_log: [
    { key: 'detected_at', label: 'Date', type: 'date' },
    { key: 'status_to', label: 'Status', type: 'string' },
    { key: 'consultant_name', label: 'Consultant', type: 'string' },
    { key: 'comments', label: 'Comments', type: 'string', truncate: true },
  ],
  strategic_referrals: [
    { key: 'referral_date', label: 'Date', type: 'date' },
    { key: 'consultant_name', label: 'Consultant', type: 'string' },
  ],
};
