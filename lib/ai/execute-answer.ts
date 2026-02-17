/**
 * Answer Mode Data Execution
 *
 * Takes an Answer mode response from the AI, executes the data query
 * via queryDataAsset(), and formats the result into a natural language answer.
 *
 * This is used server-side in the API route when the AI calls the query_data tool.
 */

import { queryDataAsset } from '@/lib/data/data-asset-queries';
import type { DataAssetParams } from '@/lib/data/shape-contracts';

interface ExecuteAnswerParams {
  dataAsset: string;
  parameters: Record<string, unknown>;
  dateRange?: { start: string; end: string };
  consultantId?: string;
}

export async function executeAnswer(
  params: ExecuteAnswerParams
): Promise<{ value: string; error?: string }> {
  try {
    const queryParams: DataAssetParams = {
      assetKey: params.dataAsset,
      shape: 'single_value', // Default to single_value for answer queries
      filters: {
        dateRange: params.dateRange,
        consultantId: params.consultantId,
      },
    };

    const result = await queryDataAsset(queryParams);

    if (result.data._shape === 'single_value') {
      return {
        value: `${result.data.label}: ${result.data.value.toLocaleString()}`,
      };
    }

    return {
      value: `Query returned ${result.metadata.recordCount} records in ${result.metadata.queryTime}ms`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Query failed';
    return { value: '', error: message };
  }
}
