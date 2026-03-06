'use client';

import { useMemo, useState } from 'react';
import { usePipelineDrillDown } from '@/lib/pipeline/drill-down-context';
import { useConsultantJobsData } from '@/lib/pipeline/hooks';
import { STAGE_COLORS, STAGE_LABELS } from '@/lib/pipeline/constants';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Briefcase,
} from 'lucide-react';
import type { ConsultantJobRow } from '@/lib/pipeline/types';

export function ConsultantJobsSheet({ monthStart }: { monthStart: string }) {
  const { jobsRequest, closeDrillDown } = usePipelineDrillDown();
  const { rows, totalRows, isLoading, error } = useConsultantJobsData(
    jobsRequest?.consultantId ?? null,
    jobsRequest?.monthStart ?? monthStart
  );

  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string>('activeSubs');
  const [sortAsc, setSortAsc] = useState(false);

  const isOpen = !!jobsRequest;

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const term = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(term) ||
        r.companyName.toLowerCase().includes(term) ||
        (r.status ?? '').toLowerCase().includes(term)
    );
  }, [rows, search]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const av = a[sortCol as keyof ConsultantJobRow] ?? '';
      const bv = b[sortCol as keyof ConsultantJobRow] ?? '';
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
  }, [filteredRows, sortCol, sortAsc]);

  const handleSort = (key: string) => {
    if (sortCol === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(key);
      setSortAsc(key === 'title' || key === 'companyName');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDrillDown();
      setSearch('');
      setSortCol('activeSubs');
      setSortAsc(false);
    }
  };

  const columns = [
    { key: 'title', label: 'Job Title' },
    { key: 'companyName', label: 'Company' },
    { key: 'employmentType', label: 'Type' },
    { key: 'value', label: 'Value' },
    { key: 'activeSubs', label: 'Subs' },
    { key: 'highestStage', label: 'Highest Stage' },
    { key: 'status', label: 'Status' },
    { key: 'dateLastModified', label: 'Last Modified' },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-4xl w-full flex flex-col gap-0 p-0"
      >
        {/* Header */}
        <div className="border-b px-6 py-4">
          <SheetHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-gray-500" />
              <SheetTitle className="text-lg font-semibold">
                {jobsRequest?.consultantName ?? 'Consultant'} — Jobs
              </SheetTitle>
              {!isLoading && (
                <Badge variant="secondary" className="text-xs">
                  {totalRows} jobs
                </Badge>
              )}
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              Open job orders with active pipeline submissions
            </SheetDescription>
          </SheetHeader>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {error ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-sm text-red-600">
              <p>Failed to load jobs</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          ) : isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-5 flex-[2]" />
                  <Skeleton className="h-5 flex-[2]" />
                  <Skeleton className="h-5 flex-1" />
                  <Skeleton className="h-5 flex-1" />
                  <Skeleton className="h-5 flex-1" />
                </div>
              ))}
            </div>
          ) : sortedRows.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              {search ? 'No matching jobs' : 'No open jobs'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-2.5 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                      onClick={() => handleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortCol === col.key &&
                          (sortAsc ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          ))}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedRows.map((row) => (
                  <JobRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function JobRow({ row }: { row: ConsultantJobRow }) {
  const stageColor = row.highestStage
    ? STAGE_COLORS[row.highestStage] ?? '#94a3b8'
    : undefined;
  const stageLabel = row.highestStage
    ? STAGE_LABELS[row.highestStage] ?? row.highestStage
    : null;

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-2.5 max-w-[220px]">
        <span className="block truncate font-medium text-gray-900" title={row.title}>
          {row.title}
        </span>
      </td>
      <td className="px-4 py-2.5 max-w-[180px]">
        <span className="block truncate text-gray-700" title={row.companyName}>
          {row.companyName}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <Badge
          variant="outline"
          className={
            row.employmentType === 'Contract'
              ? 'border-blue-200 text-blue-700 bg-blue-50'
              : 'border-emerald-200 text-emerald-700 bg-emerald-50'
          }
        >
          {row.employmentType === 'Contract' ? 'Contract' : 'Perm'}
        </Badge>
      </td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        {row.employmentType === 'Contract' && row.gpPerHour != null ? (
          <span className="text-gray-700 font-medium">${row.gpPerHour.toFixed(2)}/hr</span>
        ) : row.employmentType !== 'Contract' && row.fee != null ? (
          <span className="text-gray-700 font-medium">${row.fee.toLocaleString('en-NZ', { maximumFractionDigits: 0 })}</span>
        ) : (
          <span className="text-xs text-gray-300">-</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-center">
        {row.activeSubs > 0 ? (
          <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-teal-100 px-1.5 text-xs font-semibold text-teal-800">
            {row.activeSubs}
          </span>
        ) : (
          <span className="text-xs text-gray-300">0</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        {stageLabel ? (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: stageColor }}
          >
            {stageLabel}
          </span>
        ) : (
          <span className="text-xs text-gray-300">-</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <span className="text-gray-600">{row.status ?? '-'}</span>
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">
        {row.dateLastModified
          ? new Date(row.dateLastModified).toLocaleDateString('en-NZ', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : '-'}
      </td>
    </tr>
  );
}
