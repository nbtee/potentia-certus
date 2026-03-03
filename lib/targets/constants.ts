export interface TargetCategory {
  key: string;
  label: string;
  tab: 'revenue' | 'activity';
  unit: 'currency' | 'count';
  activityTypes: string[];
}

/** Titles that get placement count targets instead of revenue targets */
export const PLACEMENT_TITLES = new Set(['talent_manager', 'senior_talent_manager']);

export const TARGET_CATEGORIES: TargetCategory[] = [
  {
    key: 'revenue',
    label: 'Revenue',
    tab: 'revenue',
    unit: 'currency',
    activityTypes: [],
  },
  {
    key: 'placements',
    label: 'Placements',
    tab: 'revenue',
    unit: 'count',
    activityTypes: [],
  },
  {
    key: 'candidate_calls',
    label: 'Candidate Calls',
    tab: 'activity',
    unit: 'count',
    activityTypes: [
      'Candidate Connect/Follow Up',
      'LMTCB',
      'Candidate Screening Call',
      'Headhunt Call',
      'Post Placement Check In',
    ],
  },
  {
    key: 'candidate_meetings',
    label: 'Candidate Meetings',
    tab: 'activity',
    unit: 'count',
    activityTypes: [
      'Coffee Catch Up - Candidate',
      'Consultant Interview',
    ],
  },
  {
    key: 'bd_calls',
    label: 'BD Calls',
    tab: 'activity',
    unit: 'count',
    activityTypes: ['BD Call'],
  },
  {
    key: 'adam_calls',
    label: 'AD/AM Calls',
    tab: 'activity',
    unit: 'count',
    activityTypes: ['AD Call', 'AM Call'],
  },
  {
    key: 'client_meetings',
    label: 'Client Meetings',
    tab: 'activity',
    unit: 'count',
    activityTypes: ['BD Meeting', 'Coffee Catch Up - Client'],
  },
  {
    key: 'strategic_referrals',
    label: 'Strategic Referrals',
    tab: 'activity',
    unit: 'count',
    activityTypes: ['Strategic Referral'],
  },
];

export const REVENUE_CATEGORIES = TARGET_CATEGORIES.filter(
  (c) => c.tab === 'revenue'
);

export const ACTIVITY_CATEGORIES = TARGET_CATEGORIES.filter(
  (c) => c.tab === 'activity'
);

export const TARGET_CATEGORY_MAP = Object.fromEntries(
  TARGET_CATEGORIES.map((c) => [c.key, c])
) as Record<string, TargetCategory>;

// =============================================================================
// Asset Key → Target Type Mapping
// Maps KPI card asset keys to the corresponding consultant_targets.target_type values.
// Composite assets (e.g. client_call_count) sum multiple target types.
// Assets absent from this map have no target (no progress bar shown).
// =============================================================================

export const ASSET_TO_TARGET_KEYS: Record<string, string[]> = {
  client_call_count: ['bd_calls', 'adam_calls'],
  client_meeting_count: ['client_meetings'],
  candidate_call_count: ['candidate_calls'],
  candidate_meeting_count: ['candidate_meetings'],
  strategic_referral_count: ['strategic_referrals'],
  placement_count: ['placements'],
};

// =============================================================================
// Revenue Mode (GP per Hour vs Dollar Figure)
// =============================================================================

export type RevenueMode = 'gp_per_hour' | 'dollar';

export const REVENUE_MODE_OPTIONS: { value: RevenueMode; label: string; shortLabel: string }[] = [
  { value: 'dollar', label: 'Dollar Figure', shortLabel: '$' },
  { value: 'gp_per_hour', label: 'GP per Hour', shortLabel: '$/hr' },
];

export const DEFAULT_REVENUE_MODE: RevenueMode = 'dollar';
