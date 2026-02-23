'use client';

import { useState, useCallback } from 'react';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Save, Copy, Undo2, CheckCircle2, XCircle } from 'lucide-react';
import { MonthSelector } from './month-selector';
import {
  TargetSpreadsheet,
  buildUpsertPayload,
} from './target-spreadsheet';
import {
  useMonthlyTargets,
  useBulkUpsertTargets,
  useCopyFromPreviousMonth,
} from '@/lib/admin/hooks';
import {
  REVENUE_CATEGORIES,
  ACTIVITY_CATEGORIES,
} from '@/lib/targets/constants';
import {
  getCurrentMonthStart,
  getMonthStart,
  navigateMonth,
} from '@/lib/targets/month-utils';

interface StatusMessage {
  type: 'success' | 'error';
  text: string;
}

export function TargetsGrid() {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthStart);
  const monthStart = getMonthStart(currentMonth);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const { data: grid, isLoading } = useMonthlyTargets(monthStart);
  const upsertMutation = useBulkUpsertTargets();
  const copyMutation = useCopyFromPreviousMonth();

  // Dirty cells: key = "consultantId:targetType", value = new numeric value
  const [dirtyMap, setDirtyMap] = useState<Map<string, number>>(new Map());
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);

  const isDirty = dirtyMap.size > 0;

  function showStatus(type: 'success' | 'error', text: string) {
    setStatus({ type, text });
    setTimeout(() => setStatus(null), 4000);
  }

  // Reset dirty state when month changes
  const handleMonthChange = useCallback((month: Date) => {
    setCurrentMonth(month);
    setDirtyMap(new Map());
    setStatus(null);
  }, []);

  const handleCellChange = useCallback(
    (consultantId: string, targetType: string, value: number | null) => {
      setDirtyMap((prev) => {
        const next = new Map(prev);
        const key = `${consultantId}:${targetType}`;
        if (value === null) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
        return next;
      });
    },
    []
  );

  async function handleSave() {
    if (!grid || dirtyMap.size === 0) return;
    const payload = buildUpsertPayload(
      dirtyMap,
      grid.monthStart,
      grid.monthEnd
    );
    try {
      const result = await upsertMutation.mutateAsync(payload);
      showStatus('success', `${result?.count ?? dirtyMap.size} target(s) saved.`);
      setDirtyMap(new Map());
    } catch (err) {
      showStatus(
        'error',
        err instanceof Error ? err.message : 'Failed to save targets'
      );
    }
  }

  async function handleCopy() {
    if (!grid) return;
    const prevMonth = navigateMonth(currentMonth, -1);
    const prevStart = getMonthStart(prevMonth);
    try {
      const result = await copyMutation.mutateAsync({
        sourceMonthStart: prevStart,
        destMonthStart: grid.monthStart,
      });
      setShowCopyConfirm(false);
      if (!result?.count) {
        showStatus(
          'success',
          'Nothing to copy — all cells already have values, or no targets exist in the previous month.'
        );
      } else {
        showStatus(
          'success',
          `${result.count} target(s) copied from previous month.`
        );
      }
    } catch (err) {
      setShowCopyConfirm(false);
      showStatus(
        'error',
        err instanceof Error ? err.message : 'Failed to copy targets'
      );
    }
  }

  function handleDiscard() {
    setDirtyMap(new Map());
    setStatus(null);
  }

  return (
    <div>
      <AdminPageHeader
        title="Monthly Targets"
        description="Set revenue and activity targets per consultant. Click any cell to edit, then save all changes at once."
      >
        <MonthSelector
          currentMonth={currentMonth}
          onChange={handleMonthChange}
        />
      </AdminPageHeader>

      {/* Status banner */}
      {status && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${
            status.type === 'success'
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {status.text}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : grid ? (
        <>
          <Tabs defaultValue="revenue" className="space-y-4">
            <TabsList>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="activity">Activity Targets</TabsTrigger>
            </TabsList>

            <TabsContent value="revenue">
              <TargetSpreadsheet
                grid={grid}
                categories={REVENUE_CATEGORIES}
                dirtyMap={dirtyMap}
                onCellChange={handleCellChange}
              />
            </TabsContent>

            <TabsContent value="activity">
              <TargetSpreadsheet
                grid={grid}
                categories={ACTIVITY_CATEGORIES}
                dirtyMap={dirtyMap}
                onCellChange={handleCellChange}
              />
            </TabsContent>
          </Tabs>

          {/* Action bar */}
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCopyConfirm(true)}
              disabled={copyMutation.isPending}
            >
              {copyMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Copy from Previous Month
            </Button>

            <div className="flex-1" />

            {isDirty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Discard Changes
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || upsertMutation.isPending}
            >
              {upsertMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
              {isDirty && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">
                  {dirtyMap.size}
                </span>
              )}
            </Button>
          </div>
        </>
      ) : (
        <div className="py-20 text-center text-sm text-gray-500">
          Failed to load targets.
        </div>
      )}

      {/* Copy confirmation dialog */}
      <AlertDialog open={showCopyConfirm} onOpenChange={setShowCopyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copy from previous month?</AlertDialogTitle>
            <AlertDialogDescription>
              This will copy all targets from the previous month into any empty
              cells for the current month. Existing values will not be
              overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCopy}>
              Copy Targets
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
