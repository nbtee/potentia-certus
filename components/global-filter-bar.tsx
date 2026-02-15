'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, Building2 } from 'lucide-react';
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

interface GlobalFilterBarProps {
  userRole: 'consultant' | 'team_lead' | 'manager' | 'admin';
}

// Predefined date ranges
const dateRanges = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom Range', value: 'custom' },
];

export function GlobalFilterBar({ userRole }: GlobalFilterBarProps) {
  const [dateRange, setDateRange] = useState('30d');
  const [hierarchyScope, setHierarchyScope] = useState('my-team');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  // Hierarchy scope options based on role
  const getHierarchyOptions = () => {
    const options = [{ label: 'My Performance', value: 'self' }];

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

  return (
    <div className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm border">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Time Period:</span>
      </div>

      <Select value={dateRange} onValueChange={setDateRange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {dateRanges.map((range) => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {dateRange === 'custom' && (
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
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
      )}

      <div className="h-6 w-px bg-gray-300" />

      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">View:</span>
      </div>

      <Select value={hierarchyScope} onValueChange={setHierarchyScope}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select scope" />
        </SelectTrigger>
        <SelectContent>
          {hierarchyOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto">
        <Button variant="outline" size="sm">
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
