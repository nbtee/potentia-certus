'use client';

import { memo } from 'react';
import type { DashboardWidget } from '@/lib/dashboards/types';
import type { DateRange } from '@/lib/contexts/filter-context';
import { WIDGET_COMPONENTS, buildWidgetProps } from '@/lib/widgets/widget-resolver';
import { WidgetErrorBoundary } from '@/components/widgets/widget-error-boundary';
import { X } from 'lucide-react';

interface WidgetRendererProps {
  widget: DashboardWidget;
  dateRange: DateRange;
  isEditing?: boolean;
  onRemove?: (widgetId: string) => void;
}

export const WidgetRenderer = memo(function WidgetRenderer({
  widget,
  dateRange,
  isEditing,
  onRemove,
}: WidgetRendererProps) {
  const Component = WIDGET_COMPONENTS[widget.widget_type];

  if (!Component) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">
          Unknown widget type: {widget.widget_type}
        </p>
      </div>
    );
  }

  const props = buildWidgetProps(widget, dateRange);

  return (
    <div className="relative h-full">
      <WidgetErrorBoundary
        fallbackTitle={
          (widget.widget_config?.title as string) || widget.widget_type
        }
      >
        <Component {...props} />
      </WidgetErrorBoundary>

      {isEditing && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(widget.id);
          }}
          className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-transform hover:scale-110"
          title="Remove widget"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
});
