'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  formatMonthLabel,
  navigateMonth,
} from '@/lib/targets/month-utils';

interface MonthSelectorProps {
  currentMonth: Date;
  onChange: (month: Date) => void;
}

export function MonthSelector({ currentMonth, onChange }: MonthSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(navigateMonth(currentMonth, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[120px] text-center text-sm font-semibold">
        {formatMonthLabel(currentMonth)}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(navigateMonth(currentMonth, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
