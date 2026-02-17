'use client';

import { useState } from 'react';
import { useWidgetData } from '@/lib/data/use-widget-data';
import { isTabular, type Tabular } from '@/lib/data/shape-contracts';
import { formatValue } from '@/lib/utils/format';
import type { DateRange } from '@/lib/contexts/filter-context';
import { motion } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnDef,
  type OnChangeFn,
  flexRender,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps {
  assetKey: string;
  title: string;
  dateRange?: DateRange;
  consultantId?: string;
  pageSize?: number;
}

function formatCellValue(
  value: unknown,
  format?: 'currency' | 'percentage' | 'date' | 'datetime'
): string {
  if (value === null || value === undefined) return '—';
  if (format === 'currency' && typeof value === 'number') {
    return formatValue(value, 'currency');
  }
  if (format === 'percentage' && typeof value === 'number') {
    return formatValue(value, 'percentage');
  }
  if (format === 'date' && typeof value === 'string') {
    return new Date(value).toLocaleDateString('en-NZ');
  }
  if (format === 'datetime' && typeof value === 'string') {
    return new Date(value).toLocaleString('en-NZ');
  }
  return String(value);
}

export function DataTable({
  assetKey,
  title,
  dateRange,
  consultantId,
  pageSize = 20,
}: DataTableProps) {
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);

  const offset = (page - 1) * pageSize;

  const { data, isLoading, error } = useWidgetData({
    assetKey,
    shape: 'tabular',
    filters: { dateRange, consultantId },
    limit: pageSize,
    offset,
  });

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-red-200 bg-red-50 p-6"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Failed to load data</h3>
            <p className="mt-1 text-sm text-red-700">{error.message}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!data || !isTabular(data.data)) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  const tabularData = data.data as Tabular<Record<string, unknown>>;

  return (
    <>
      <DataTableInner
        title={title}
        tabularData={tabularData}
        sorting={sorting}
        setSorting={setSorting}
        page={page}
        setPage={setPage}
        onRowClick={setSelectedRow}
      />

      {/* Drill-through Sheet */}
      <Sheet open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Record Details</SheetTitle>
          </SheetHeader>
          {selectedRow && (
            <div className="mt-6 space-y-4">
              {tabularData.columns.map((col) => (
                <div key={col.key}>
                  <dt className="text-sm font-medium text-gray-500">
                    {col.label}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatCellValue(selectedRow[col.key], col.format)}
                  </dd>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function DataTableInner({
  title,
  tabularData,
  sorting,
  setSorting,
  page,
  setPage,
  onRowClick,
}: {
  title: string;
  tabularData: Tabular<Record<string, unknown>>;
  sorting: SortingState;
  setSorting: OnChangeFn<SortingState>;
  page: number;
  setPage: (p: number) => void;
  onRowClick: (row: Record<string, unknown>) => void;
}) {
  const columns: ColumnDef<Record<string, unknown>>[] = tabularData.columns.map(
    (col) => ({
      accessorKey: col.key,
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {col.label}
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ getValue }) => formatCellValue(getValue(), col.format),
    })
  );

  const table = useReactTable({
    data: tabularData.rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const pagination = tabularData.pagination;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {tabularData.totalRows !== undefined && (
          <span className="text-sm text-gray-500">
            {tabularData.totalRows.toLocaleString()} records
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-gray-500"
                >
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                  onClick={() => onRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
          <span className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
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
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
