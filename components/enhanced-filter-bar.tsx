'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, Building2, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useFilters, calculateDateRange } from '@/lib/contexts/filter-context';

interface EnhancedFilterBarProps {
  userRole: 'consultant' | 'team_lead' | 'manager' | 'admin';
}

const dateRanges = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom Range', value: 'custom' },
];

export function EnhancedFilterBar({ userRole }: EnhancedFilterBarProps) {
  const { filters, setDateRange, setHierarchyScope, resetFilters } = useFilters();

  // Local state for UI controls
  const [dateRangePreset, setDateRangePreset] = useState('30d');
  const [hierarchyScope, setLocalHierarchyScope] = useState<'self' | 'my-team' | 'region' | 'national'>('my-team');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);

  const getHierarchyOptions = (): Array<{ label: string; value: 'self' | 'my-team' | 'region' | 'national' }> => {
    const options: Array<{ label: string; value: 'self' | 'my-team' | 'region' | 'national' }> = [
      { label: 'My Performance', value: 'self' }
    ];

    if (userRole === 'team_lead' || userRole === 'manager' || userRole === 'admin') {
      options.push({ label: 'My Team', value: 'my-team' });
    }

    if (userRole === 'manager' || userRole === 'admin') {
      options.push({ label: 'Region', value: 'region' });
    }

    if (userRole === 'admin') {
      options.push({ label: 'National', value: 'national' });
    }

    return options;
  };

  const hierarchyOptions = getHierarchyOptions();

  const handleApplyFilters = () => {
    // Calculate actual date range from preset or custom dates
    let dateRange;
    if (dateRangePreset === 'custom' && customStartDate && customEndDate) {
      dateRange = {
        start: customStartDate.toISOString().split('T')[0],
        end: customEndDate.toISOString().split('T')[0],
      };
    } else {
      dateRange = calculateDateRange(dateRangePreset);
    }

    // Apply filters to context
    setDateRange(dateRange);
    setHierarchyScope(hierarchyScope);
    setFiltersApplied(true);
  };

  const handleClearFilters = () => {
    setDateRangePreset('30d');
    setLocalHierarchyScope('my-team');
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    setFiltersApplied(false);
    resetFilters();
  };

  const handleHierarchyScopeChange = (value: string) => {
    setLocalHierarchyScope(value as 'self' | 'my-team' | 'region' | 'national');
  };

  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
      className="relative overflow-hidden rounded-xl border border-gray-200 bg-white/80 backdrop-blur-xl p-4 shadow-lg shadow-gray-100/50"
    >
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 via-transparent to-blue-500/5 pointer-events-none" />

      <div className="relative flex flex-wrap items-center gap-4">
        {/* Filter Icon */}
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-blue-100">
            <Filter className="h-5 w-5 text-sky-600" />
          </div>
          <span className="text-sm font-semibold text-gray-900">Filters</span>
        </div>

        <div className="h-10 w-px bg-gray-200" />

        {/* Date Range */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Time Period
          </label>
          <Select value={dateRangePreset} onValueChange={setDateRangePreset}>
            <SelectTrigger className="h-9 w-[180px] border-gray-200 bg-white hover:bg-gray-50 transition-colors">
              <Calendar className="mr-2 h-4 w-4 text-gray-500" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {dateRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Picker */}
        <AnimatePresence>
          {dateRangePreset === 'custom' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-gray-200 bg-white hover:bg-gray-50"
                  >
                    {customStartDate && customEndDate
                      ? `${format(customStartDate, 'MMM d')} - ${format(customEndDate, 'MMM d, yyyy')}`
                      : 'Pick dates'}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex gap-2 p-3">
                    <div>
                      <div className="text-sm font-medium mb-2">Start Date</div>
                      <CalendarComponent
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">End Date</div>
                      <CalendarComponent
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        disabled={(date) =>
                          customStartDate ? date < customStartDate : false
                        }
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hierarchy Scope */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Scope
          </label>
          <Select value={hierarchyScope} onValueChange={handleHierarchyScopeChange}>
            <SelectTrigger className="h-9 w-[180px] border-gray-200 bg-white hover:bg-gray-50 transition-colors">
              <Building2 className="mr-2 h-4 w-4 text-gray-500" />
              <SelectValue placeholder="Select scope" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {hierarchyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2">
          <AnimatePresence>
            {filtersApplied && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700 border-green-200"
                >
                  Filters Applied
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>

          {filtersApplied && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 text-gray-600 hover:text-gray-900"
            >
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleApplyFilters}
            className="h-9 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white shadow-lg shadow-sky-500/30 transition-all"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
