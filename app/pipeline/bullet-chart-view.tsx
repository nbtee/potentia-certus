'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';
import { formatValue } from '@/lib/utils/format';
import type { PipelineRow, BulletChartData, TeamType } from '@/lib/pipeline/types';

function deriveBulletChartData(rows: PipelineRow[], teamType: TeamType): BulletChartData[] {
  const isContract = teamType === 'contract';
  return rows
    .filter((r) => r.type === 'team')
    .map((r) => ({
      teamId: r.id,
      teamName: r.name,
      confirmed: isContract ? r.confirmedGpPerHour : r.confirmedRevenue,
      forecast: isContract
        ? r.confirmedGpPerHour + r.weightedGpPerHour
        : r.confirmedRevenue + r.weightedPipelineRevenue,
      target: isContract ? (r.gpPerHourTarget ?? 0) : (r.target ?? 0),
    }));
}

interface BulletChartViewProps {
  rows: PipelineRow[];
  teamType: TeamType;
}

export function BulletChartView({ rows, teamType }: BulletChartViewProps) {
  const isContract = teamType === 'contract';
  const chartData = useMemo(() => deriveBulletChartData(rows, teamType), [rows, teamType]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-gray-200 bg-white">
        <p className="text-sm text-gray-500">No team data available</p>
      </div>
    );
  }

  // Find max value for x-axis domain
  const maxVal = Math.max(
    ...chartData.map((d) => Math.max(d.forecast, d.target) * 1.15)
  );

  const barData = chartData.map((d) => ({
    name: d.teamName,
    confirmed: d.confirmed,
    pipeline: d.forecast - d.confirmed, // stacked portion
    target: d.target,
  }));

  const formatTick = (v: number) => {
    if (isContract) return `$${v.toFixed(0)}/hr`;
    return formatCompact(v);
  };

  const formatMetric = (v: number) => {
    if (isContract) return `$${v.toFixed(2)}/hr`;
    return formatValue(v, 'currency');
  };

  const confirmedLabel = isContract ? 'Confirmed GP/hr' : 'Confirmed Revenue';
  const pipelineLabel = isContract ? 'Weighted GP/hr' : 'Weighted Pipeline';

  return (
    <div className="space-y-4">
      {barData.map((team) => (
        <div
          key={team.name}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{team.name}</h3>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>
                Confirmed: <span className="font-medium text-gray-700">{formatMetric(team.confirmed)}</span>
              </span>
              <span>
                Forecast: <span className="font-medium text-gray-700">{formatMetric(team.confirmed + team.pipeline)}</span>
              </span>
              <span>
                Target: <span className="font-medium text-gray-700">{team.target > 0 ? formatMetric(team.target) : 'N/A'}</span>
              </span>
            </div>
          </div>
          <div className="h-[48px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[team]}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  domain={[0, maxVal]}
                  tickFormatter={formatTick}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip content={<BulletTooltip isContract={isContract} />} />

                {/* Background bands: poor / satisfactory / good */}
                {team.target > 0 && (
                  <>
                    <ReferenceArea
                      x1={0}
                      x2={team.target * 0.33}
                      fill="#00E5C0"
                      fillOpacity={0.06}
                    />
                    <ReferenceArea
                      x1={team.target * 0.33}
                      x2={team.target * 0.66}
                      fill="#00E5C0"
                      fillOpacity={0.12}
                    />
                    <ReferenceArea
                      x1={team.target * 0.66}
                      x2={team.target}
                      fill="#00E5C0"
                      fillOpacity={0.18}
                    />
                  </>
                )}

                {/* Confirmed bar (dark) */}
                <Bar
                  dataKey="confirmed"
                  stackId="a"
                  barSize={20}
                  radius={[4, 0, 0, 4]}
                >
                  <Cell fill="#0B141B" />
                </Bar>
                {/* Pipeline weighted bar (lighter) */}
                <Bar
                  dataKey="pipeline"
                  stackId="a"
                  barSize={20}
                  radius={[0, 4, 4, 0]}
                >
                  <Cell fill="#00E5C0" />
                </Bar>

                {/* Target line */}
                {team.target > 0 && (
                  <ReferenceLine
                    x={team.target}
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-[#0B141B]" />
          <span>{confirmedLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-[#00E5C0]" />
          <span>{pipelineLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-0.5 border-l-2 border-dashed border-red-500" />
          <span>Target</span>
        </div>
      </div>
    </div>
  );
}

function BulletTooltip({
  active,
  payload,
  isContract,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  isContract: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg text-xs">
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="text-gray-500 capitalize">{entry.name}:</span>
          <span className="font-medium text-gray-900">
            {isContract
              ? `$${entry.value.toFixed(2)}/hr`
              : formatValue(entry.value, 'currency')}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatCompact(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value}`;
}
