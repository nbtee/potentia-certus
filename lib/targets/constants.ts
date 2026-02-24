export interface TargetCategory {
  key: string;
  label: string;
  tab: 'revenue' | 'activity';
  unit: 'currency' | 'count';
  activityTypes: string[];
}

export const TARGET_CATEGORIES: TargetCategory[] = [
  {
    key: 'revenue',
    label: 'Revenue',
    tab: 'revenue',
    unit: 'currency',
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
