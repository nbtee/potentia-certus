'use client';

import { useState, useMemo } from 'react';
import { usePipelineDrillDown } from '@/lib/pipeline/drill-down-context';
import { usePipelineDrillDownData } from '@/lib/pipeline/hooks';
import {
  PERM_DRILL_DOWN_COLUMNS,
  CONTRACT_DRILL_DOWN_COLUMNS,
  type PipelineDrillDownColumn,
} from '@/lib/pipeline/constants';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { PipelineDrillDownRow } from '@/lib/pipeline/types';

interface PipelineDrillDownSheetProps {
  monthStart: string;
}

export function PipelineDrillDownSheet({ monthStart }: PipelineDrillDownSheetProps) {
  const { request, closeDrillDown } = usePipelineDrillDown();
  const {
    rows,
    totalRows,
    page,
    pageSize,
    totalPages,
    setPage,
    isLoading,
    error,
  } = usePipelineDrillDownData(request, monthStart);

  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const isOpen = !!request;
  const isContract = request?.teamType === 'contract';
  const columns = isContract ? CONTRACT_DRILL_DOWN_COLUMNS : PERM_DRILL_DOWN_COLUMNS;

  // Client-side search filter
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const term = search.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const val = row[col.key as keyof PipelineDrillDownRow];
        if (val == null) return false;
        return String(val).toLowerCase().includes(term);
      })
    );
  }, [rows, search, columns]);

  // Client-side sort
  const sortedRows = useMemo(() => {
    if (!sortCol) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const av = a[sortCol as keyof PipelineDrillDownRow] ?? '';
      const bv = b[sortCol as keyof PipelineDrillDownRow] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
  }, [filteredRows, sortCol, sortAsc]);

  const handleSort = (key: string) => {
    if (sortCol === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(key);
      setSortAsc(true);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDrillDown();
      setSearch('');
      setExpandedRow(null);
      setSortCol(null);
      setSortAsc(true);
    }
  };

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
              <SheetTitle className="text-lg font-semibold">
                {request?.title ?? 'Pipeline Details'}
              </SheetTitle>
              {!isLoading && (
                <Badge variant="secondary" className="text-xs">
                  {totalRows.toLocaleString()} records
                </Badge>
              )}
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              {isContract ? 'Contract GP/hr pipeline' : 'Permanent revenue pipeline'} — {monthStart}
            </SheetDescription>
          </SheetHeader>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Table body */}
        <div className="flex-1 overflow-auto">
          {error ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-sm text-red-600">
              <p>Failed to load records</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          ) : isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  {columns.map((col) => (
                    <Skeleton key={col.key} className="h-5 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          ) : sortedRows.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              {search ? 'No matching records' : 'No records found'}
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
                        {sortCol === col.key && (
                          sortAsc
                            ? <ChevronUp className="h-3 w-3" />
                            : <ChevronDown className="h-3 w-3" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedRows.map((row, idx) => (
                  <DrillDownTableRow
                    key={row.id}
                    row={row}
                    columns={columns}
                    isExpanded={expandedRow === idx}
                    onToggle={() => setExpandedRow(expandedRow === idx ? null : idx)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="border-t px-6 py-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
              <span className="ml-2 text-xs">
                ({(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalRows)} of {totalRows})
              </span>
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DrillDownTableRow({
  row,
  columns,
  isExpanded,
  onToggle,
}: {
  row: PipelineDrillDownRow;
  columns: PipelineDrillDownColumn[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        {columns.map((col) => (
          <td key={col.key} className="px-4 py-2.5">
            <CellValue
              value={row[col.key as keyof PipelineDrillDownRow]}
              type={col.type}
              truncate={'truncate' in col && col.truncate}
            />
          </td>
        ))}
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={columns.length} className="bg-muted/20 px-4 py-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {columns.map((col) => (
                <div key={col.key}>
                  <span className="font-medium text-muted-foreground">{col.label}: </span>
                  <span className="break-words">
                    <CellValue
                      value={row[col.key as keyof PipelineDrillDownRow]}
                      type={col.type}
                      truncate={false}
                    />
                  </span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function CellValue({
  value,
  type,
  truncate,
}: {
  value: unknown;
  type: string;
  truncate?: boolean;
}) {
  if (value == null || value === '') {
    return <span className="text-muted-foreground">-</span>;
  }

  if (type === 'date') {
    const str = String(value);
    try {
      const d = new Date(str);
      return (
        <span className="whitespace-nowrap">
          {d.toLocaleDateString('en-NZ', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      );
    } catch {
      return <span>{str.substring(0, 10)}</span>;
    }
  }

  if (type === 'currency') {
    const num = Number(value);
    return (
      <span className="whitespace-nowrap font-medium">
        ${num.toLocaleString('en-NZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </span>
    );
  }

  if (type === 'rate') {
    const num = Number(value);
    return (
      <span className="whitespace-nowrap font-medium">
        ${num.toFixed(2)}/hr
      </span>
    );
  }

  if (type === 'percent') {
    const num = Number(value);
    return (
      <span className="whitespace-nowrap">
        {(num * 100).toFixed(0)}%
      </span>
    );
  }

  const str = String(value);
  if (truncate && str.length > 60) {
    return (
      <span className="max-w-[200px] truncate block" title={str}>
        {str.substring(0, 60)}...
      </span>
    );
  }

  return <span>{str}</span>;
}
