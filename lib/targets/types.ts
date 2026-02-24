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
  actual: number;
  target: number | null;
  percentage: number | null; // null when no target set
}

export interface MonthPerformance {
  monthStart: string;
  monthLabel: string;
  categories: CategoryPerformance[];
}

export interface PerformanceData {
  current: MonthPerformance;
  history: MonthPerformance[];
}
