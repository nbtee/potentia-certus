'use client';

import { useState, useMemo } from 'react';
import { useDataAssets } from '@/lib/data-assets/hooks';
import { useAddWidget } from '@/lib/dashboards/hooks';
import { WIDGET_REGISTRY } from '@/lib/widgets/widget-registry';
import { DEFAULT_WIDGET_SIZES } from '@/lib/widgets/widget-resolver';
import type { DataAsset, ShapeContract } from '@/lib/data-assets/types';
import type { WidgetConfig } from '@/lib/dashboards/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';

interface AddWidgetDialogProps {
  dashboardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWidgetAdded: () => void;
}

type Step = 'asset' | 'widget_type' | 'configure';

export function AddWidgetDialog({
  dashboardId,
  open,
  onOpenChange,
  onWidgetAdded,
}: AddWidgetDialogProps) {
  const { data: assets, isLoading: assetsLoading } = useDataAssets();
  const addWidget = useAddWidget();

  const [step, setStep] = useState<Step>('asset');
  const [selectedAsset, setSelectedAsset] = useState<DataAsset | null>(null);
  const [selectedWidgetType, setSelectedWidgetType] = useState<string | null>(null);
  const [config, setConfig] = useState<WidgetConfig>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Group assets by category
  const groupedAssets = useMemo(() => {
    if (!assets) return {};
    const filtered = searchQuery
      ? assets.filter(
          (a) =>
            a.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.asset_key.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : assets;

    return filtered.reduce(
      (groups, asset) => {
        const cat = asset.category || 'other';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(asset);
        return groups;
      },
      {} as Record<string, DataAsset[]>
    );
  }, [assets, searchQuery]);

  // Widget types compatible with selected asset
  const compatibleWidgetTypes = useMemo(() => {
    if (!selectedAsset) return [];
    const assetShapes = new Set(selectedAsset.output_shapes);
    return Object.entries(WIDGET_REGISTRY)
      .filter(([, entry]) => assetShapes.has(entry.expectedShape as ShapeContract))
      .map(([key, entry]) => ({
        key,
        ...entry,
      }));
  }, [selectedAsset]);

  const handleSelectAsset = (asset: DataAsset) => {
    setSelectedAsset(asset);
    setSelectedWidgetType(null);
    setConfig({});
    setStep('widget_type');
  };

  const handleSelectWidgetType = (widgetType: string) => {
    setSelectedWidgetType(widgetType);
    // Set default title
    setConfig({
      title: selectedAsset?.display_name || '',
    });
    setStep('configure');
  };

  const handleBack = () => {
    if (step === 'widget_type') {
      setStep('asset');
      setSelectedAsset(null);
    } else if (step === 'configure') {
      setStep('widget_type');
      setSelectedWidgetType(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAsset || !selectedWidgetType) return;

    const defaults = DEFAULT_WIDGET_SIZES[selectedWidgetType] || {
      w: 4,
      h: 3,
      minW: 2,
      minH: 2,
    };

    await addWidget.mutateAsync({
      dashboardId,
      dataAssetId: selectedAsset.id,
      widgetType: selectedWidgetType,
      parameters: {},
      widgetConfig: config,
      position: { x: 0, y: Infinity, w: defaults.w, h: defaults.h },
    });

    // Reset state
    setStep('asset');
    setSelectedAsset(null);
    setSelectedWidgetType(null);
    setConfig({});
    setSearchQuery('');
    onWidgetAdded();
  };

  const categoryLabels: Record<string, string> = {
    activity: 'Activity Metrics',
    revenue: 'Revenue',
    pipeline: 'Pipeline',
    performance: 'Performance',
    engagement: 'Engagement',
    other: 'Other',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== 'asset' && (
              <button
                onClick={handleBack}
                className="rounded p-1 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {step === 'asset' && 'Select Data Asset'}
            {step === 'widget_type' && 'Select Widget Type'}
            {step === 'configure' && 'Configure Widget'}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto py-2">
          {/* Step 1: Select Data Asset */}
          {step === 'asset' && (
            <div className="space-y-4">
              <Input
                placeholder="Search data assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {assetsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                Object.entries(groupedAssets).map(([category, categoryAssets]) => (
                  <div key={category} className="space-y-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {categoryLabels[category] || category}
                    </h3>
                    {categoryAssets.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => handleSelectAsset(asset)}
                        className="flex w-full items-center justify-between rounded-lg border border-transparent p-3 text-left transition-colors hover:border-gray-200 hover:bg-gray-50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {asset.display_name}
                          </div>
                          {asset.description && (
                            <div className="mt-0.5 text-xs text-gray-500 truncate">
                              {asset.description}
                            </div>
                          )}
                          <div className="mt-1 flex gap-1">
                            {asset.output_shapes.map((shape) => (
                              <Badge
                                key={shape}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {shape}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <ChevronRight className="ml-2 h-4 w-4 flex-shrink-0 text-gray-400" />
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Step 2: Select Widget Type */}
          {step === 'widget_type' && (
            <div className="space-y-1">
              <p className="mb-3 text-xs text-gray-500">
                Showing widget types compatible with{' '}
                <span className="font-medium">{selectedAsset?.display_name}</span>
              </p>
              {compatibleWidgetTypes.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  No compatible widget types found
                </p>
              ) : (
                compatibleWidgetTypes.map((wt) => (
                  <button
                    key={wt.key}
                    onClick={() => handleSelectWidgetType(wt.key)}
                    className="flex w-full items-center justify-between rounded-lg border border-transparent p-3 text-left transition-colors hover:border-gray-200 hover:bg-gray-50"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {wt.label}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {wt.description}
                      </div>
                    </div>
                    <ChevronRight className="ml-2 h-4 w-4 flex-shrink-0 text-gray-400" />
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 3: Configure */}
          {step === 'configure' && selectedWidgetType && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="widget-title">Title</Label>
                <Input
                  id="widget-title"
                  value={config.title || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Widget title"
                />
              </div>

              {/* Color scheme for KPI cards / conversion indicators */}
              {(selectedWidgetType === 'kpi_card' ||
                selectedWidgetType === 'conversion_indicator') && (
                <div className="space-y-2">
                  <Label>Color Scheme</Label>
                  <div className="flex gap-2">
                    {(['teal', 'green', 'purple', 'orange'] as const).map(
                      (color) => (
                        <button
                          key={color}
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              colorScheme: color,
                            }))
                          }
                          className={`h-8 w-8 rounded-full border-2 transition-all ${
                            config.colorScheme === color
                              ? 'border-gray-900 scale-110'
                              : 'border-transparent'
                          }`}
                          style={{
                            backgroundColor:
                              color === 'teal'
                                ? '#00E5C0'
                                : color === 'green'
                                  ? '#10b981'
                                  : color === 'purple'
                                    ? '#8b5cf6'
                                    : '#f59e0b',
                          }}
                        />
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Icon for KPI cards */}
              {selectedWidgetType === 'kpi_card' && (
                <div className="space-y-2">
                  <Label htmlFor="widget-icon">Icon</Label>
                  <select
                    id="widget-icon"
                    value={config.icon || 'activity'}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, icon: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="activity">Activity</option>
                    <option value="phone">Phone</option>
                    <option value="users">Users</option>
                    <option value="coffee">Coffee</option>
                    <option value="trending_up">Trending Up</option>
                    <option value="user_check">User Check</option>
                    <option value="bar_chart">Bar Chart</option>
                    <option value="target">Target</option>
                    <option value="briefcase">Briefcase</option>
                  </select>
                </div>
              )}

              {/* Chart type for time series / donut */}
              {selectedWidgetType === 'time_series_chart' && (
                <div className="space-y-2">
                  <Label>Chart Type</Label>
                  <div className="flex gap-2">
                    {(['line', 'area'] as const).map((type) => (
                      <Button
                        key={type}
                        variant={
                          (config.chartType || 'area') === type
                            ? 'default'
                            : 'outline'
                        }
                        size="sm"
                        onClick={() =>
                          setConfig((prev) => ({ ...prev, chartType: type }))
                        }
                      >
                        {type === 'line' ? 'Line' : 'Area'}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {selectedWidgetType === 'donut_chart' && (
                <div className="space-y-2">
                  <Label>Chart Type</Label>
                  <div className="flex gap-2">
                    {(['donut', 'pie'] as const).map((type) => (
                      <Button
                        key={type}
                        variant={
                          (config.chartType || 'donut') === type
                            ? 'default'
                            : 'outline'
                        }
                        size="sm"
                        onClick={() =>
                          setConfig((prev) => ({ ...prev, chartType: type }))
                        }
                      >
                        {type === 'donut' ? 'Donut' : 'Pie'}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Target value for gauges */}
              {selectedWidgetType === 'target_gauge' && (
                <div className="space-y-2">
                  <Label htmlFor="target-value">Target Value</Label>
                  <Input
                    id="target-value"
                    type="number"
                    value={config.targetValue || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        targetValue: Number(e.target.value) || undefined,
                      }))
                    }
                    placeholder="100"
                  />
                </div>
              )}

              {/* Orientation for bar charts */}
              {selectedWidgetType === 'bar_chart' && (
                <div className="space-y-2">
                  <Label>Orientation</Label>
                  <div className="flex gap-2">
                    {(['vertical', 'horizontal'] as const).map((dir) => (
                      <Button
                        key={dir}
                        variant={
                          (config.orientation || 'vertical') === dir
                            ? 'default'
                            : 'outline'
                        }
                        size="sm"
                        onClick={() =>
                          setConfig((prev) => ({ ...prev, orientation: dir }))
                        }
                      >
                        {dir === 'vertical' ? 'Vertical' : 'Horizontal'}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color picker for chart types */}
              {(selectedWidgetType === 'time_series_chart' ||
                selectedWidgetType === 'bar_chart') && (
                <div className="space-y-2">
                  <Label htmlFor="chart-color">Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="chart-color"
                      type="color"
                      value={config.color || '#00E5C0'}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, color: e.target.value }))
                      }
                      className="h-8 w-8 cursor-pointer rounded border-0"
                    />
                    <span className="text-xs text-gray-500">
                      {config.color || '#00E5C0'}
                    </span>
                  </div>
                </div>
              )}

              {/* Page size for data tables */}
              {selectedWidgetType === 'data_table' && (
                <div className="space-y-2">
                  <Label htmlFor="page-size">Rows per page</Label>
                  <Input
                    id="page-size"
                    type="number"
                    value={config.pageSize || 10}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        pageSize: Number(e.target.value) || 10,
                      }))
                    }
                    min={5}
                    max={50}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {step === 'configure' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={addWidget.isPending}
            >
              {addWidget.isPending ? (
                'Adding...'
              ) : (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  Add Widget
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
