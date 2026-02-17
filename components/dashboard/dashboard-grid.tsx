'use client';

import { useCallback, useRef, useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import type { DashboardWidget, LayoutItem } from '@/lib/dashboards/types';
import type { DateRange } from '@/lib/contexts/filter-context';
import { WidgetRenderer } from './widget-renderer';
import { DEFAULT_WIDGET_SIZES } from '@/lib/widgets/widget-resolver';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  widgets: DashboardWidget[];
  layout: LayoutItem[];
  dateRange: DateRange;
  isEditable: boolean;
  onLayoutChange: (layout: LayoutItem[]) => void;
  onRemoveWidget: (widgetId: string) => void;
}

export function DashboardGrid({
  widgets,
  layout,
  dateRange,
  isEditable,
  onLayoutChange,
  onRemoveWidget,
}: DashboardGridProps) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build grid layouts from our LayoutItem[]
  const gridLayouts = useMemo(() => {
    const items: Layout[] = layout.map((item) => {
      const defaults = DEFAULT_WIDGET_SIZES[
        widgets.find((w) => w.id === item.i)?.widget_type ?? ''
      ];
      return {
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: defaults?.minW ?? 2,
        minH: defaults?.minH ?? 2,
      };
    });
    return { lg: items, md: items, sm: items };
  }, [layout, widgets]);

  // Build a widget lookup for fast rendering
  const widgetMap = useMemo(() => {
    const map = new Map<string, DashboardWidget>();
    for (const w of widgets) {
      map.set(w.id, w);
    }
    return map;
  }, [widgets]);

  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      if (!isEditable) return;

      // Debounce saves to avoid hammering the server
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        const items: LayoutItem[] = newLayout.map((item) => ({
          i: item.i,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
        }));
        onLayoutChange(items);
      }, 500);
    },
    [isEditable, onLayoutChange]
  );

  if (widgets.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-500">No widgets yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Click &quot;Add Widget&quot; to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveGridLayout
      layouts={gridLayouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768 }}
      cols={{ lg: 12, md: 8, sm: 4 }}
      rowHeight={80}
      isDraggable={isEditable}
      isResizable={isEditable}
      onLayoutChange={handleLayoutChange}
      draggableCancel=".no-drag"
      compactType="vertical"
      margin={[16, 16]}
    >
      {layout.map((item) => {
        const widget = widgetMap.get(item.i);
        if (!widget) return <div key={item.i} />;

        return (
          <div key={item.i} className={isEditable ? 'cursor-move' : ''}>
            <WidgetRenderer
              widget={widget}
              dateRange={dateRange}
              isEditing={isEditable}
              onRemove={onRemoveWidget}
            />
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
}
