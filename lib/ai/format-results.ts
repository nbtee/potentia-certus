/**
 * AI Result Formatter
 *
 * Formats shape contract query results into human-readable text
 * that the AI model receives as tool output, then synthesizes
 * into its final response to the user.
 */

import type {
  DataShape,
  SingleValue,
  Categorical,
  TimeSeries,
  FunnelStages,
} from '@/lib/data/shape-contracts';

/**
 * Format a shape contract result as readable text for the AI to interpret.
 */
export function formatShapeResult(
  data: DataShape,
  assetKey: string,
  scope: string,
  dateRange?: { start: string; end: string }
): string {
  const header = buildHeader(assetKey, scope, dateRange);

  switch (data._shape) {
    case 'single_value':
      return `${header}\n${formatSingleValue(data)}`;
    case 'categorical':
      return `${header}\n${formatCategorical(data)}`;
    case 'time_series':
      return `${header}\n${formatTimeSeries(data)}`;
    case 'funnel_stages':
      return `${header}\n${formatFunnelStages(data)}`;
    case 'matrix':
      return `${header}\nMatrix data with ${data.rows.length} rows and ${data.columns.length} columns.`;
    case 'tabular':
      return `${header}\n${data.rows.length} rows returned (${data.totalRows ?? data.rows.length} total).`;
    default:
      return `${header}\nData returned successfully.`;
  }
}

function buildHeader(
  assetKey: string,
  scope: string,
  dateRange?: { start: string; end: string }
): string {
  const parts = [`Data: ${assetKey}`];
  if (scope) parts.push(`Scope: ${scope}`);
  if (dateRange) parts.push(`Period: ${dateRange.start} to ${dateRange.end}`);
  return parts.join(' | ');
}

function formatSingleValue(data: SingleValue): string {
  const lines: string[] = [];
  const formatted = formatNumber(data.value, data.format);
  lines.push(`${data.label}: ${formatted}`);

  if (data.comparison) {
    const pct = (data.comparison.value * 100).toFixed(1);
    const arrow = data.comparison.direction === 'up' ? '+' : data.comparison.direction === 'down' ? '-' : '';
    lines.push(`Change: ${arrow}${pct}% ${data.comparison.label}`);
  }

  return lines.join('\n');
}

function formatCategorical(data: Categorical): string {
  const lines: string[] = [];

  if (data.format === 'percentage') {
    // Conversion rate leaderboard — values are decimals (0.0-1.0)
    lines.push('Ranked by conversion rate:');
    for (let i = 0; i < data.categories.length; i++) {
      const cat = data.categories[i];
      const pct = (cat.value * 100).toFixed(1);
      let line = `  ${i + 1}. ${cat.label}: ${pct}%`;
      if (cat.metadata) {
        const num = cat.metadata.numerator as number | undefined;
        const den = cat.metadata.denominator as number | undefined;
        if (num !== undefined && den !== undefined) {
          line += ` (${num} of ${den})`;
        }
      }
      lines.push(line);
    }
    return lines.join('\n');
  }

  const total = data.categories.reduce((sum, c) => sum + c.value, 0);
  lines.push(`Total: ${total.toLocaleString()}`);
  lines.push('');

  // Ranked list
  lines.push('Breakdown by consultant:');
  for (let i = 0; i < data.categories.length; i++) {
    const cat = data.categories[i];
    const pct = total > 0 ? ((cat.value / total) * 100).toFixed(1) : '0.0';
    lines.push(`  ${i + 1}. ${cat.label}: ${cat.value.toLocaleString()} (${pct}%)`);
  }

  // Series breakdown if available
  if (data.series && data.series.length > 0) {
    lines.push('');
    lines.push('By type:');
    for (const s of data.series) {
      const seriesTotal = s.data.reduce((sum, d) => sum + d.value, 0);
      lines.push(`  ${s.name}: ${seriesTotal.toLocaleString()}`);
    }
  }

  return lines.join('\n');
}

function formatTimeSeries(data: TimeSeries): string {
  const lines: string[] = [];

  for (const series of data.series) {
    if (series.data.length === 0) {
      lines.push(`${series.name}: No data points.`);
      continue;
    }

    const values = series.data.map((d) => d.value);
    const total = values.reduce((sum, v) => sum + v, 0);
    const avg = total / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const firstDate = series.data[0].date;
    const lastDate = series.data[series.data.length - 1].date;

    lines.push(`${series.name}:`);
    lines.push(`  Period: ${firstDate} to ${lastDate} (${values.length} data points)`);
    lines.push(`  Total: ${total.toLocaleString()}`);
    lines.push(`  Daily average: ${avg.toFixed(1)}`);
    lines.push(`  Range: ${min} - ${max}`);

    // Show recent trend (last 7 data points vs prior 7)
    if (values.length >= 14) {
      const recent = values.slice(-7).reduce((s, v) => s + v, 0);
      const prior = values.slice(-14, -7).reduce((s, v) => s + v, 0);
      if (prior > 0) {
        const change = ((recent - prior) / prior * 100).toFixed(1);
        lines.push(`  Recent trend: ${Number(change) >= 0 ? '+' : ''}${change}% (last 7 days vs prior 7)`);
      }
    }
  }

  return lines.join('\n');
}

function formatFunnelStages(data: FunnelStages): string {
  const lines: string[] = [];
  lines.push('Pipeline funnel:');

  for (const stage of data.stages) {
    let line = `  ${stage.name}: ${stage.value.toLocaleString()}`;
    if (stage.conversionRate !== undefined) {
      line += ` (${(stage.conversionRate * 100).toFixed(1)}% conversion from previous stage)`;
    }
    lines.push(line);
  }

  // Overall conversion if we have first and last
  if (data.stages.length >= 2) {
    const first = data.stages[0].value;
    const last = data.stages[data.stages.length - 1].value;
    if (first > 0) {
      const overall = ((last / first) * 100).toFixed(1);
      lines.push(`  Overall conversion (${data.stages[0].name} → ${data.stages[data.stages.length - 1].name}): ${overall}%`);
    }
  }

  return lines.join('\n');
}

function formatNumber(value: number, format?: string): string {
  switch (format) {
    case 'currency':
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    default:
      return value.toLocaleString();
  }
}
