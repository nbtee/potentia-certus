'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatMonthLabel, getMonthStart } from '@/lib/targets/month-utils';
import { Loader2, CalendarRange } from 'lucide-react';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface ApplyToMonthsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceMonth: Date;
  isPending: boolean;
  onApply: (destMonths: string[], overwrite: boolean) => void;
}

export function ApplyToMonthsDialog({
  open,
  onOpenChange,
  sourceMonth,
  isPending,
  onApply,
}: ApplyToMonthsDialogProps) {
  const sourceYear = sourceMonth.getFullYear();
  const sourceMonthIdx = sourceMonth.getMonth();
  const sourceKey = getMonthStart(sourceMonth);

  const [selectedYear, setSelectedYear] = useState(sourceYear);
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set());
  const [overwrite, setOverwrite] = useState(false);

  // Reset state when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedYear(sourceYear);
      setSelectedMonths(new Set());
      setOverwrite(false);
    }
    onOpenChange(nextOpen);
  };

  // Year options: source year -1 through source year +2
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = sourceYear - 1; y <= sourceYear + 2; y++) {
      years.push(y);
    }
    return years;
  }, [sourceYear]);

  const isSourceMonth = (monthIdx: number) =>
    selectedYear === sourceYear && monthIdx === sourceMonthIdx;

  const toggleMonth = (monthIdx: number) => {
    if (isSourceMonth(monthIdx)) return;
    setSelectedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthIdx)) {
        next.delete(monthIdx);
      } else {
        next.add(monthIdx);
      }
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set<number>();
    for (let i = 0; i < 12; i++) {
      if (!isSourceMonth(i)) all.add(i);
    }
    setSelectedMonths(all);
  };

  const selectClear = () => {
    setSelectedMonths(new Set());
  };

  const selectRestOfYear = () => {
    const rest = new Set<number>();
    const startIdx = selectedYear === sourceYear ? sourceMonthIdx + 1 : 0;
    for (let i = startIdx; i < 12; i++) {
      rest.add(i);
    }
    setSelectedMonths(rest);
  };

  const destMonthStrings = useMemo(() => {
    return Array.from(selectedMonths)
      .sort((a, b) => a - b)
      .map((m) => {
        const d = new Date(selectedYear, m, 1);
        return getMonthStart(d);
      })
      .filter((key) => key !== sourceKey);
  }, [selectedMonths, selectedYear, sourceKey]);

  const handleApply = () => {
    if (destMonthStrings.length === 0) return;
    onApply(destMonthStrings, overwrite);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            Apply to Months
          </DialogTitle>
          <DialogDescription>
            Copy targets from <span className="font-medium">{formatMonthLabel(sourceMonth)}</span> to
            the selected months.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Year selector */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">Year</Label>
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => {
                setSelectedYear(Number(v));
                setSelectedMonths(new Set());
              }}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-2">
            {MONTH_LABELS.map((label, idx) => {
              const isSource = isSourceMonth(idx);
              const isSelected = selectedMonths.has(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isSource}
                  onClick={() => toggleMonth(idx)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                    isSource &&
                      'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400',
                    !isSource &&
                      !isSelected &&
                      'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                    !isSource &&
                      isSelected &&
                      'border-teal-300 bg-teal-50 text-teal-700'
                  )}
                >
                  {label}
                  {isSource && (
                    <span className="ml-1 text-xs text-gray-400">(src)</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick-select buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="text-xs"
            >
              All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectClear}
              className="text-xs"
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectRestOfYear}
              className="text-xs"
            >
              Rest of Year
            </Button>
          </div>

          {/* Overwrite toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <div className="space-y-0.5">
              <Label htmlFor="overwrite-toggle" className="text-sm font-medium">
                Overwrite existing targets
              </Label>
              <p className="text-xs text-muted-foreground">
                When off, only empty cells are filled
              </p>
            </div>
            <Switch
              id="overwrite-toggle"
              checked={overwrite}
              onCheckedChange={setOverwrite}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={destMonthStrings.length === 0 || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                Apply to {destMonthStrings.length} month
                {destMonthStrings.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
