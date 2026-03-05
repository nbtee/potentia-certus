'use client';

import { useState } from 'react';
import { Bookmark, BookmarkCheck, Calendar, ChevronDown, Filter, X } from 'lucide-react';
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
import { useFilters, type ScopePreset } from '@/lib/contexts/filter-context';
import { ScopePicker } from '@/components/scope-picker';
import { FilterBookmarks } from '@/components/filter-bookmarks';
import type { SavedFilter } from '@/lib/filters/saved-filters';

const dateRanges = [
  { label: 'This Week', value: 'wtd' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'This Month', value: 'mtd' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom Range', value: 'custom' },
];

export function EnhancedFilterBar() {
  const {
    filters,
    dateRangePreset,
    setDateRange,
    setDateRangePreset,
    setScope,
    resetFilters,
    saveCurrentView,
    clearSavedView,
    hasSavedView,
  } = useFilters();

  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  // Detect if filters differ from defaults
  const hasActiveFilters = dateRangePreset !== '30d' || filters.scope.preset !== 'self';

  const handleDateRangeChange = (preset: string) => {
    setDateRangePreset(preset);
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      setDateRange({
        start: customStartDate.toISOString().split('T')[0],
        end: customEndDate.toISOString().split('T')[0],
      });
      setIsCustomOpen(false);
    }
  };

  const handleClearFilters = () => {
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    resetFilters();
  };

  const handleApplyBookmark = (bookmark: SavedFilter) => {
    const { dateRangePreset: preset, scope } = bookmark.filter_state;
    setDateRangePreset(preset);
    setScope({
      preset: scope.preset as ScopePreset,
      selectedNodeIds: scope.selectedNodeIds ?? [],
    });
  };

  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
      className="relative overflow-hidden rounded-xl border border-gray-200 bg-white/80 backdrop-blur-xl p-4 shadow-lg shadow-gray-100/50"
    >
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />

      <div className="relative flex flex-wrap items-center gap-4">
        {/* Filter Icon */}
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100">
            <Filter className="h-5 w-5 text-brand-darkest" />
          </div>
          <span className="text-sm font-semibold text-gray-900">Filters</span>
        </div>

        <div className="h-10 w-px bg-gray-200" />

        {/* Date Range */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Time Period
          </label>
          <Select value={dateRangePreset} onValueChange={handleDateRangeChange}>
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
              className="flex items-end gap-2"
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
                  <div className="border-t p-3 flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleCustomDateApply}
                      disabled={!customStartDate || !customEndDate}
                    >
                      Apply
                    </Button>
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
          <ScopePicker />
        </div>

        {/* Filter Bookmarks */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Saved
          </label>
          <FilterBookmarks
            dateRangePreset={dateRangePreset}
            onApplyBookmark={handleApplyBookmark}
          />
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2">
          <AnimatePresence>
            {hasSavedView && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  Default View
                </Badge>
              </motion.div>
            )}
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700 border-green-200"
                >
                  Filters Active
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save / Clear View */}
          {hasSavedView ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSavedView}
              className="h-9 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
              title="Clear saved default view"
            >
              <BookmarkCheck className="mr-1 h-4 w-4" />
              Clear Default
            </Button>
          ) : (
            hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={saveCurrentView}
                className="h-9 text-gray-600 hover:text-gray-900"
                title="Save current filters as your default view"
              >
                <Bookmark className="mr-1 h-4 w-4" />
                Save View
              </Button>
            )
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 text-gray-600 hover:text-gray-900"
            >
              <X className="mr-1 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
