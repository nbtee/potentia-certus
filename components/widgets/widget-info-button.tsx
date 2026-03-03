'use client';

import { HelpCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface WidgetInfoButtonProps {
  description: string;
}

export function WidgetInfoButton({ description }: WidgetInfoButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="no-drag inline-flex items-center justify-center rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="How this data works"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="max-w-xs text-sm"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p className="mb-1 text-xs font-semibold text-gray-500">
          How this data works
        </p>
        <p className="text-gray-700 leading-relaxed">{description}</p>
      </PopoverContent>
    </Popover>
  );
}
