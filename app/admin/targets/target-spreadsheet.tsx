'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type {
  MonthlyTargetGrid,
  TargetConsultantRow,
  UpsertTargetInput,
} from '@/lib/admin/types';
import type { TargetCategory } from '@/lib/targets/constants';

interface TargetSpreadsheetProps {
  grid: MonthlyTargetGrid;
  categories: TargetCategory[];
  dirtyMap: Map<string, number>;
  onCellChange: (
    consultantId: string,
    targetType: string,
    value: number | null
  ) => void;
}

function cellKey(consultantId: string, targetType: string) {
  return `${consultantId}:${targetType}`;
}

function EditableCell({
  consultantId,
  targetType,
  serverValue,
  dirtyValue,
  unit,
  onChange,
}: {
  consultantId: string;
  targetType: string;
  serverValue: number | undefined;
  dirtyValue: number | undefined;
  unit: 'currency' | 'count';
  onChange: (
    consultantId: string,
    targetType: string,
    value: number | null
  ) => void;
}) {
  const isDirty = dirtyValue !== undefined;
  const displayValue = dirtyValue ?? serverValue;
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function handleStartEdit() {
    setInputValue(displayValue !== undefined ? String(displayValue) : '');
    setEditing(true);
  }

  function handleCommit() {
    setEditing(false);
    const trimmed = inputValue.trim();
    if (trimmed === '') {
      // Clear → if there was a server value, set to 0; otherwise do nothing
      if (serverValue !== undefined) {
        onChange(consultantId, targetType, 0);
      }
      return;
    }
    const num = parseFloat(trimmed);
    if (isNaN(num) || num < 0) return;
    // Only mark dirty if different from server value
    if (num !== serverValue) {
      onChange(consultantId, targetType, num);
    } else if (isDirty) {
      // Reverting to server value — clear dirty
      onChange(consultantId, targetType, null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleCommit();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min="0"
        step={unit === 'currency' ? '100' : '1'}
        className="h-7 w-full rounded border border-blue-400 bg-white px-1.5 text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex h-7 cursor-pointer items-center justify-end rounded px-1.5 text-sm tabular-nums transition-colors hover:bg-gray-100',
        isDirty && 'bg-amber-50 font-medium text-amber-900'
      )}
      onClick={handleStartEdit}
    >
      {displayValue !== undefined ? (
        unit === 'currency' ? (
          `$${displayValue.toLocaleString()}`
        ) : (
          displayValue.toLocaleString()
        )
      ) : (
        <span className="text-gray-300">—</span>
      )}
    </div>
  );
}

export function TargetSpreadsheet({
  grid,
  categories,
  dirtyMap,
  onCellChange,
}: TargetSpreadsheetProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 min-w-[200px]">
              Consultant
            </th>
            {categories.map((cat) => (
              <th
                key={cat.key}
                className="px-3 py-2 text-right font-semibold text-gray-700 min-w-[120px]"
              >
                {cat.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.regions.map((region) => (
            <>
              {/* Region header */}
              <tr key={`region-${region.regionNodeId}`}>
                <td
                  colSpan={categories.length + 1}
                  className="bg-gray-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-500"
                >
                  {region.regionName}
                </td>
              </tr>
              {region.teams.map((team) => (
                <>
                  {/* Team header */}
                  <tr key={`team-${team.teamNodeId}`}>
                    <td
                      colSpan={categories.length + 1}
                      className="bg-gray-50/80 px-3 py-1 pl-5 text-xs font-semibold text-gray-600"
                    >
                      {team.teamName}
                    </td>
                  </tr>
                  {team.consultants.map((c) => (
                    <tr
                      key={c.consultantId}
                      className="border-t border-gray-100 hover:bg-gray-50/50"
                    >
                      <td className="sticky left-0 z-10 bg-white px-3 py-1 pl-8 font-medium text-gray-800">
                        {c.firstName} {c.lastName}
                      </td>
                      {categories.map((cat) => {
                        const key = cellKey(c.consultantId, cat.key);
                        return (
                          <td key={cat.key} className="px-2 py-1">
                            <EditableCell
                              consultantId={c.consultantId}
                              targetType={cat.key}
                              serverValue={c.targets[cat.key]?.value}
                              dirtyValue={dirtyMap.get(key)}
                              unit={cat.unit}
                              onChange={onCellChange}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Build the array of UpsertTargetInput from dirty map + grid metadata */
export function buildUpsertPayload(
  dirtyMap: Map<string, number>,
  monthStart: string,
  monthEnd: string
): UpsertTargetInput[] {
  const results: UpsertTargetInput[] = [];
  for (const [key, value] of dirtyMap) {
    const [consultantId, targetType] = key.split(':');
    results.push({
      consultant_id: consultantId,
      target_type: targetType,
      target_value: value,
      period_start: monthStart,
      period_end: monthEnd,
    });
  }
  return results;
}
