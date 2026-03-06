'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatValue } from '@/lib/utils/format';
import type { PipelineRow, PipelineStage, TeamType } from '@/lib/pipeline/types';
import { STAGE_COLORS } from '@/lib/pipeline/constants';
import { usePipelineDrillDown } from '@/lib/pipeline/drill-down-context';

interface PipelineTableProps {
  rows: PipelineRow[];
  stages: PipelineStage[];
  teamType: TeamType;
  monthStart: string;
}

export function PipelineTable({ rows, stages, teamType, monthStart }: PipelineTableProps) {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const isContract = teamType === 'contract';

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const revenueLabel = isContract ? 'GP/hr' : 'Revenue';

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/80">
            <TableHead className="w-[200px] sticky left-0 bg-gray-50/80 z-10">
              Team / Consultant
            </TableHead>
            <TableHead className="text-center text-xs w-[50px]" title="Open jobs (by status)">Jobs</TableHead>
            {stages.map((stage) => (
              <TableHead
                key={stage.status}
                className="text-center text-xs w-[60px]"
              >
                {stage.label}
              </TableHead>
            ))}
            <TableHead className="text-right text-xs w-[90px]">{revenueLabel}</TableHead>
            <TableHead className="text-right text-xs w-[90px]">Target</TableHead>
            <TableHead className="text-right text-xs w-[90px]">Gap</TableHead>
            <TableHead className="text-center text-xs w-[80px]">% Target</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((team) => {
            const isExpanded = expandedTeams.has(team.id);
            return (
              <TeamBlock
                key={team.id}
                team={team}
                stages={stages}
                teamType={teamType}
                isExpanded={isExpanded}
                onToggle={() => toggleTeam(team.id)}
              />
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={stages.length + 6} className="h-24 text-center text-gray-500">
                No pipeline data
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function TeamBlock({
  team,
  stages,
  teamType,
  isExpanded,
  onToggle,
}: {
  team: PipelineRow;
  stages: PipelineStage[];
  teamType: TeamType;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { openDrillDown } = usePipelineDrillDown();
  const isContract = teamType === 'contract';

  // Collect all children's consultant IDs for team-level drill-down
  const teamConsultantIds = team.children?.map((c) => c.id) ?? [];

  const getMetrics = (row: PipelineRow) => {
    if (isContract) {
      return {
        total: row.confirmedGpPerHour + row.weightedGpPerHour,
        target: row.gpPerHourTarget,
        gap: row.gpPerHourGap,
        pct: row.gpPerHourPercentToTarget,
      };
    }
    return {
      total: row.confirmedRevenue + row.weightedPipelineRevenue,
      target: row.target,
      gap: row.gap,
      pct: row.percentToTarget,
    };
  };

  const formatMetric = (value: number) => {
    if (isContract) return `$${value.toFixed(2)}/hr`;
    return formatValue(value, 'currency');
  };

  const teamMetrics = getMetrics(team);

  const handleBadgeClick = (status: string, consultantIds: string[], label: string) => {
    openDrillDown({
      consultantIds,
      status,
      teamType,
      title: `${label} — ${status}`,
    });
  };

  return (
    <>
      {/* Team row */}
      <TableRow
        className="bg-gray-50/50 cursor-pointer hover:bg-gray-100/50 font-medium"
        onClick={onToggle}
      >
        <TableCell className="sticky left-0 bg-gray-50/50 z-10">
          <div className="flex items-center gap-2">
            <ChevronRight
              className={cn(
                'h-4 w-4 text-gray-400 transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
            <span className="text-sm font-semibold text-gray-900">{team.name}</span>
          </div>
        </TableCell>
        <JobCountCell row={team} bold />
        {stages.map((stage) => (
          <TableCell key={stage.status} className="text-center p-2">
            <StageBadge
              count={team.stageCounts[stage.status] ?? 0}
              status={stage.status}
              onClick={() => {
                if ((team.stageCounts[stage.status] ?? 0) > 0) {
                  handleBadgeClick(stage.status, teamConsultantIds, team.name);
                }
              }}
            />
          </TableCell>
        ))}
        <TableCell className="text-right text-sm font-semibold text-gray-900">
          {formatMetric(teamMetrics.total)}
        </TableCell>
        <TableCell className="text-right text-sm text-gray-700">
          {teamMetrics.target !== null ? formatMetric(teamMetrics.target) : '-'}
        </TableCell>
        <TableCell className="text-right text-sm">
          <GapDisplay gap={teamMetrics.gap} isContract={isContract} />
        </TableCell>
        <TableCell className="text-center">
          <PercentBadge pct={teamMetrics.pct} />
        </TableCell>
      </TableRow>

      {/* Expanded consultant rows */}
      {isExpanded &&
        team.children?.map((consultant) => {
          const m = getMetrics(consultant);
          return (
            <TableRow key={consultant.id} className="bg-white">
              <TableCell className="sticky left-0 bg-white z-10 pl-10">
                <span className="text-sm text-gray-700">{consultant.name}</span>
              </TableCell>
              <JobCountCell row={consultant} />
              {stages.map((stage) => (
                <TableCell key={stage.status} className="text-center p-2">
                  <StageBadge
                    count={consultant.stageCounts[stage.status] ?? 0}
                    status={stage.status}
                    onClick={() => {
                      if ((consultant.stageCounts[stage.status] ?? 0) > 0) {
                        handleBadgeClick(stage.status, [consultant.id], consultant.name);
                      }
                    }}
                  />
                </TableCell>
              ))}
              <TableCell className="text-right text-sm text-gray-700">
                {formatMetric(m.total)}
              </TableCell>
              <TableCell className="text-right text-sm text-gray-500">
                {m.target !== null ? formatMetric(m.target) : '-'}
              </TableCell>
              <TableCell className="text-right text-sm">
                <GapDisplay gap={m.gap} isContract={isContract} />
              </TableCell>
              <TableCell className="text-center">
                <PercentBadge pct={m.pct} />
              </TableCell>
            </TableRow>
          );
        })}
    </>
  );
}

function StageBadge({
  count,
  status,
  onClick,
}: {
  count: number;
  status: string;
  onClick: () => void;
}) {
  if (count === 0) return <span className="text-xs text-gray-300">-</span>;
  const color = STAGE_COLORS[status] ?? '#94a3b8';
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80 cursor-pointer"
      style={{ backgroundColor: color }}
    >
      {count}
    </button>
  );
}

function PercentBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-xs text-gray-400">-</span>;
  }
  const colorClass =
    pct >= 90
      ? 'bg-emerald-100 text-emerald-800'
      : pct >= 70
        ? 'bg-amber-100 text-amber-800'
        : 'bg-red-100 text-red-800';
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', colorClass)}>
      {pct}%
    </span>
  );
}

function JobCountCell({ row, bold }: { row: PipelineRow; bold?: boolean }) {
  const textClass = bold ? 'text-sm font-semibold text-gray-900' : 'text-sm text-gray-700';
  return (
    <TableCell className={cn('text-center', textClass)}>
      {row.openJobs > 0 ? row.openJobs : <span className="text-xs text-gray-300">-</span>}
    </TableCell>
  );
}

function GapDisplay({ gap, isContract }: { gap: number | null; isContract: boolean }) {
  if (gap === null) return <span className="text-xs text-gray-400">-</span>;
  const isPositive = gap > 0;

  const formatGap = (v: number) => {
    if (isContract) return `$${v.toFixed(2)}/hr`;
    return formatValue(v, 'currency');
  };

  return (
    <span className={cn('text-sm', isPositive ? 'text-red-600' : 'text-emerald-600')}>
      {isPositive ? '-' : '+'}{formatGap(Math.abs(gap))}
    </span>
  );
}
