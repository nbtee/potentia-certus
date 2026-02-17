'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2 } from 'lucide-react';
import { addWidget } from '@/app/dashboards/actions';
import { WIDGET_REGISTRY } from '@/lib/widgets/widget-registry';
import { useQueryClient } from '@tanstack/react-query';
import type { BuilderResponse, WidgetPairing } from '@/lib/ai/types';

interface BuilderApprovalProps {
  response: BuilderResponse;
  dashboardId: string;
  disabled: boolean;
}

export function BuilderApproval({ response, dashboardId, disabled }: BuilderApprovalProps) {
  const queryClient = useQueryClient();
  const [approvedIndices, setApprovedIndices] = useState<Set<number>>(new Set());
  const [rejectedIndices, setRejectedIndices] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<number | 'all' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allDecided = response.pairings.every(
    (_, i) => approvedIndices.has(i) || rejectedIndices.has(i)
  );

  async function approveWidget(pairing: WidgetPairing, index: number) {
    setLoading(index);
    setError(null);

    // Look up the data asset ID by asset_key
    const result = await addWidgetFromPairing(pairing, dashboardId);

    if (result.error) {
      setError(result.error);
      setLoading(null);
      return;
    }

    setApprovedIndices((prev) => new Set([...prev, index]));
    setLoading(null);
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }

  async function approveAll() {
    setLoading('all');
    setError(null);

    for (let i = 0; i < response.pairings.length; i++) {
      if (approvedIndices.has(i) || rejectedIndices.has(i)) continue;

      const result = await addWidgetFromPairing(response.pairings[i], dashboardId);
      if (result.error) {
        setError(result.error);
        setLoading(null);
        return;
      }
      setApprovedIndices((prev) => new Set([...prev, i]));
    }

    setLoading(null);
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }

  return (
    <div className="w-full rounded-lg border bg-white p-3 text-sm">
      <p className="mb-3 font-medium text-gray-900">{response.suggestion}</p>

      <div className="space-y-2">
        {response.pairings.map((pairing, index) => {
          const entry = WIDGET_REGISTRY[pairing.widget_type];
          const isApproved = approvedIndices.has(index);
          const isRejected = rejectedIndices.has(index);
          const isLoading = loading === index || loading === 'all';

          return (
            <div
              key={index}
              className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                isApproved
                  ? 'border-green-200 bg-green-50'
                  : isRejected
                    ? 'border-gray-200 bg-gray-50 opacity-50'
                    : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="shrink-0 text-xs">
                  {entry?.label ?? pairing.widget_type}
                </Badge>
                <span className="truncate text-gray-700">
                  {pairing.widget_config.title}
                </span>
              </div>

              {!isApproved && !isRejected && !disabled && (
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => approveWidget(pairing, index)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setRejectedIndices((prev) => new Set([...prev, index]))}
                    disabled={isLoading}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {isApproved && (
                <span className="text-xs text-green-600 ml-2">Added</span>
              )}
              {isRejected && (
                <span className="text-xs text-gray-400 ml-2">Skipped</span>
              )}
            </div>
          );
        })}
      </div>

      {!allDecided && !disabled && (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            onClick={approveAll}
            disabled={loading !== null}
            className="text-xs"
          >
            {loading === 'all' ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-3 w-3" />
                Approve All
              </>
            )}
          </Button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      {response.unmatched_terms && response.unmatched_terms.length > 0 && (
        <p className="mt-2 text-xs text-amber-600">
          Note: I couldn&apos;t find data for: {response.unmatched_terms.join(', ')}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Helper: Look up asset ID and call addWidget server action
// ============================================================================

async function addWidgetFromPairing(
  pairing: WidgetPairing,
  dashboardId: string
): Promise<{ error?: string }> {
  // We need to fetch the data asset ID from the asset_key
  // Import client-side supabase for the lookup
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();

  const { data: asset, error: assetError } = await supabase
    .from('data_assets')
    .select('id')
    .eq('asset_key', pairing.data_asset)
    .single();

  if (assetError || !asset) {
    return { error: `Data asset "${pairing.data_asset}" not found` };
  }

  const result = await addWidget({
    dashboardId,
    dataAssetId: asset.id,
    widgetType: pairing.widget_type,
    parameters: pairing.parameters as Record<string, unknown>,
    widgetConfig: pairing.widget_config,
    position: {
      x: 0,
      y: Infinity, // Place at the bottom
      w: pairing.suggested_layout.w,
      h: pairing.suggested_layout.h,
    },
  });

  if (result.error) {
    return { error: result.error };
  }

  return {};
}
