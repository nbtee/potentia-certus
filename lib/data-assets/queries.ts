import { createClient } from '@/lib/supabase/server';
import type { DataAsset } from './types';

/**
 * Data Asset Query Functions
 * All database queries go through these functions to ensure RLS enforcement
 */

/**
 * Get all available data assets for the current user
 * RLS automatically filters by user's visible hierarchy nodes
 */
export async function getDataAssets(): Promise<{
  data: DataAsset[] | null;
  error: Error | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('data_assets')
      .select('*')
      .order('category', { ascending: true })
      .order('display_name', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get a specific data asset by key
 */
export async function getDataAsset(
  assetKey: string
): Promise<{ data: DataAsset | null; error: Error | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('data_assets')
      .select('*')
      .eq('asset_key', assetKey)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Execute a data asset query
 * This will be expanded in Stage E to actually run the SQL templates
 * For now, it's a placeholder that returns the asset definition
 */
export async function executeDataAsset(
  assetKey: string,
  params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: string;
    filters?: Record<string, any>;
  }
): Promise<{ data: any | null; error: Error | null }> {
  try {
    const supabase = await createClient();

    // Get the data asset definition
    const { data: asset, error: assetError } = await supabase
      .from('data_assets')
      .select('*')
      .eq('asset_key', assetKey)
      .single();

    if (assetError) {
      return { data: null, error: new Error(assetError.message) };
    }

    if (!asset) {
      return { data: null, error: new Error('Data asset not found') };
    }

    // TODO: In Stage E, this will:
    // 1. Take the asset.sql_template
    // 2. Replace placeholders with params
    // 3. Call a Supabase Edge Function to execute the SQL
    // 4. Return the results in the appropriate shape contract format

    // For now, return mock data structure
    return {
      data: {
        assetKey,
        shapeContract: asset.shape_contract,
        message: 'Data asset execution not yet implemented (Stage E)',
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}
