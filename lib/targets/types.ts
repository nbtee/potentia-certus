export interface MyTargetValue {
  targetKey: string;
  label: string;
  value: number | null;
  unit: 'currency' | 'count';
}

export interface MonthTargets {
  monthStart: string;
  monthLabel: string;
  targets: MyTargetValue[];
}

export interface CategoryPerformance {
  targetKey: string;
  label: string;
  unit: 'currency' | 'count';
  format?: 'percentage' | 'days';
  actual: number;
  target: number | null;
  percentage: number | null; // null when no target set
  metadata?: { numerator?: number; denominator?: number; jobCount?: number };
}

export interface MonthPerformance {
  monthStart: string;
  monthLabel: string;
  categories: CategoryPerformance[];
}

export type TimeWindow = '6-month' | 'ytd';

export interface PerformanceData {
  current: MonthPerformance;
  history: MonthPerformance[];
  userTitle?: string | null;
}
