'use client';

import { useState, useCallback, useRef, useEffect, Fragment } from 'react';
import { cn } from '@/lib/utils';
import type {
  MonthlyTargetGrid,
  TargetConsultantRow,
  UpsertTargetInput,
} from '@/lib/admin/types';
import type { TargetCategory } from '@/lib/targets/constants';
import {
  REVENUE_MODE_OPTIONS,
  DEFAULT_REVENUE_MODE,
  type RevenueMode,
} from '@/lib/targets/constants';

interface TargetSpreadsheetProps {
  grid: MonthlyTargetGrid;
  categories: TargetCategory[];
  dirtyMap: Map<string, number>;
  onCellChange: (
    consultantId: string,
    targetType: string,
    value: number | null
  ) => void;
  /** Revenue mode per consultant (keyed by consultantId). Only passed on Revenue tab. */
  revenueModeMap?: Map<string, RevenueMode>;
  onRevenueModeChange?: (consultantId: string, mode: RevenueMode) => void;
  /** Titles that get placements instead of revenue (disables the other column). Revenue tab only. */
  placementTitles?: Set<string>;
}

function cellKey(consultantId: string, targetType: string) {
  return `${consultantId}:${targetType}`;
}

function RevenueModeToggle({
  consultantId,
  mode,
  onChange,
}: {
  consultantId: string;
  mode: RevenueMode;
  onChange: (consultantId: string, mode: RevenueMode) => void;
}) {
  return (
    <span className="ml-2 inline-flex rounded border border-gray-200 text-[11px] leading-none">
      {REVENUE_MODE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (opt.value !== mode) onChange(consultantId, opt.value);
          }}
          className={cn(
            'px-1.5 py-0.5 transition-colors',
            opt.value === mode
              ? 'bg-gray-800 text-white'
              : 'text-gray-500 hover:bg-gray-100'
          )}
        >
          {opt.shortLabel}
        </button>
      ))}
    </span>
  );
}

function EditableCell({
  consultantId,
  targetType,
  serverValue,
  dirtyValue,
  unit,
  revenueMode,
  onChange,
}: {
  consultantId: string;
  targetType: string;
  serverValue: number | undefined;
  dirtyValue: number | undefined;
  unit: 'currency' | 'count';
  revenueMode?: RevenueMode;
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

  const isGpPerHour = revenueMode === 'gp_per_hour';

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

  function formatDisplay(val: number): string {
    if (unit === 'count') return val.toLocaleString();
    if (isGpPerHour) return `$${val.toLocaleString()}/hr`;
    return `$${val.toLocaleString()}`;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min="0"
        step={unit === 'currency' ? (isGpPerHour ? '1' : '100') : '1'}
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
        formatDisplay(displayValue)
      ) : (
        <span className="text-gray-300">&mdash;</span>
      )}
    </div>
  );
}

function DisabledCell() {
  return (
    <div className="flex h-7 items-center justify-end rounded bg-gray-50 px-1.5 text-sm text-gray-300">
      N/A
    </div>
  );
}

export function TargetSpreadsheet({
  grid,
  categories,
  dirtyMap,
  onCellChange,
  revenueModeMap,
  onRevenueModeChange,
  placementTitles,
}: TargetSpreadsheetProps) {
  const showModeToggle = !!revenueModeMap && !!onRevenueModeChange;

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
            <Fragment key={region.regionNodeId}>
              {/* Region header */}
              <tr>
                <td
                  colSpan={categories.length + 1}
                  className="bg-gray-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-500"
                >
                  {region.regionName}
                </td>
              </tr>
              {region.teams.map((team) => (
                <Fragment key={team.teamNodeId}>
                  {/* Team header */}
                  <tr>
                    <td
                      colSpan={categories.length + 1}
                      className="bg-gray-50/80 px-3 py-1 pl-5 text-xs font-semibold text-gray-600"
                    >
                      {team.teamName}
                    </td>
                  </tr>
                  {team.consultants.map((c) => {
                    const mode = revenueModeMap?.get(c.consultantId) ?? DEFAULT_REVENUE_MODE;
                    const isPlacementTitle = placementTitles
                      ? placementTitles.has(c.title ?? '')
                      : false;
                    return (
                      <tr
                        key={c.consultantId}
                        className="border-t border-gray-100 hover:bg-gray-50/50"
                      >
                        <td className="sticky left-0 z-10 bg-white px-3 py-1 pl-8 font-medium text-gray-800">
                          <span className="inline-flex items-center">
                            {c.firstName} {c.lastName}
                            {showModeToggle && !isPlacementTitle && (
                              <RevenueModeToggle
                                consultantId={c.consultantId}
                                mode={mode}
                                onChange={onRevenueModeChange}
                              />
                            )}
                          </span>
                        </td>
                        {categories.map((cat) => {
                          const key = cellKey(c.consultantId, cat.key);
                          // When placementTitles is set, disable cells based on title:
                          // TM/STM → revenue disabled, placements enabled
                          // Others → revenue enabled, placements disabled
                          const disabled = placementTitles
                            ? isPlacementTitle
                              ? cat.key === 'revenue'
                              : cat.key === 'placements'
                            : false;
                          return (
                            <td key={cat.key} className="px-2 py-1">
                              {disabled ? (
                                <DisabledCell />
                              ) : (
                                <EditableCell
                                  consultantId={c.consultantId}
                                  targetType={cat.key}
                                  serverValue={c.targets[cat.key]?.value}
                                  dirtyValue={dirtyMap.get(key)}
                                  unit={cat.unit}
                                  revenueMode={showModeToggle && cat.key === 'revenue' ? mode : undefined}
                                  onChange={onCellChange}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </Fragment>
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
  monthEnd: string,
  revenueModeMap?: Map<string, RevenueMode>,
): UpsertTargetInput[] {
  const results: UpsertTargetInput[] = [];
  for (const [key, value] of dirtyMap) {
    const [consultantId, targetType] = key.split(':');
    const input: UpsertTargetInput = {
      consultant_id: consultantId,
      target_type: targetType,
      target_value: value,
      period_start: monthStart,
      period_end: monthEnd,
    };
    // Attach revenue_mode metadata for revenue targets
    if (targetType === 'revenue' && revenueModeMap) {
      const mode = revenueModeMap.get(consultantId);
      if (mode) {
        input.metadata = { revenue_mode: mode };
      }
    }
    results.push(input);
  }
  return results;
}
