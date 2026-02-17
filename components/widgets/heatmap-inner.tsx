'use client';

import { ResponsiveHeatMap } from '@nivo/heatmap';
import type { Matrix } from '@/lib/data/shape-contracts';
import { formatValue } from '@/lib/utils/format';

interface HeatmapInnerProps {
  matrixData: Matrix;
  height: number;
}

export function HeatmapInner({ matrixData, height }: HeatmapInnerProps) {
  // Transform matrix data to Nivo's expected format: { id, data: [{ x, y }] }
  const nivoData = matrixData.rows.map((rowLabel, rowIndex) => ({
    id: rowLabel,
    data: matrixData.columns.map((col, colIndex) => ({
      x: col,
      y: matrixData.values[rowIndex]?.[colIndex] ?? 0,
    })),
  }));

  return (
    <div style={{ height }}>
      <ResponsiveHeatMap
        data={nivoData}
        margin={{ top: 60, right: 30, bottom: 30, left: 120 }}
        valueFormat={(v) => formatValue(v as number, matrixData.format)}
        axisTop={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: '',
          legendOffset: 46,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
        }}
        colors={{
          type: 'sequential',
          scheme: 'blues',
        }}
        emptyColor="#f3f4f6"
        borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
        borderWidth={1}
        borderRadius={2}
        labelTextColor={{ from: 'color', modifiers: [['darker', 2.5]] }}
        animate={true}
        motionConfig="gentle"
        hoverTarget="cell"
        tooltip={({ cell }) => (
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
            <div className="font-semibold text-gray-900">
              {cell.serieId}
            </div>
            <div className="text-gray-600">
              {String(cell.data.x)}: {formatValue(Number(cell.data.y) || 0, matrixData.format)}
            </div>
          </div>
        )}
      />
    </div>
  );
}
