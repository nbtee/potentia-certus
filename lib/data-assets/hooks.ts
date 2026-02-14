'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { DataAsset } from './types';

/**
 * React Query Hooks for Data Assets
 * Uses TanStack Query with configured staleTime and refetch settings
 */

/**
 * Hook to fetch all available data assets
 * RLS automatically filters by user's visible hierarchy nodes
 */
export function useDataAssets() {
  return useQuery({
    queryKey: ['data-assets'],
    queryFn: async (): Promise<DataAsset[]> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('data_assets')
        .select('*')
        .order('category', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
  });
}

/**
 * Hook to fetch a specific data asset by key
 */
export function useDataAsset(assetKey: string) {
  return useQuery({
    queryKey: ['data-asset', assetKey],
    queryFn: async (): Promise<DataAsset> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('data_assets')
        .select('*')
        .eq('asset_key', assetKey)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Data asset not found');
      }

      return data;
    },
    enabled: !!assetKey,
  });
}

/**
 * Hook to execute a data asset query
 * This will be expanded in Stage E to actually run the SQL templates
 */
export function useExecuteDataAsset(
  assetKey: string,
  params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: string;
    filters?: Record<string, any>;
  },
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['execute-data-asset', assetKey, params],
    queryFn: async () => {
      const supabase = createClient();

      // Get the data asset definition
      const { data: asset, error: assetError } = await supabase
        .from('data_assets')
        .select('*')
        .eq('asset_key', assetKey)
        .single();

      if (assetError) {
        throw new Error(assetError.message);
      }

      if (!asset) {
        throw new Error('Data asset not found');
      }

      // TODO: In Stage E, this will:
      // 1. Take the asset.sql_template
      // 2. Replace placeholders with params
      // 3. Call a Supabase Edge Function to execute the SQL
      // 4. Return the results in the appropriate shape contract format

      // For now, return mock data structure
      return {
        assetKey,
        shapeContract: asset.shape_contract,
        message: 'Data asset execution not yet implemented (Stage E)',
      };
    },
    enabled: enabled && !!assetKey,
  });
}
