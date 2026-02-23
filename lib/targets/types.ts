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
