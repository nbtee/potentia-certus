'use client';

import { useMemo } from 'react';
import { useDataAssets } from './hooks';

/**
 * Returns a Map of asset_key → description from the already-cached data assets query.
 * Zero extra network requests.
 */
export function useAssetDescriptions(): Map<string, string> {
  const { data: assets } = useDataAssets();

  return useMemo(() => {
    const map = new Map<string, string>();
    if (!assets) return map;
    for (const asset of assets) {
      if (asset.description) {
        map.set(asset.asset_key, asset.description);
      }
    }
    return map;
  }, [assets]);
}
