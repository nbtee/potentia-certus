'use client';

import { useState, useCallback, useRef } from 'react';
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
import { Loader2, Save, Copy, Undo2, Check, XCircle, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MonthSelector } from './month-selector';
import {
  TargetSpreadsheet,
  buildUpsertPayload,
} from './target-spreadsheet';
import { ApplyToMonthsDialog } from './apply-to-months-dialog';
import {
  useMonthlyTargets,
  useBulkUpsertTargets,
  useCopyFromPreviousMonth,
  useApplyToMonths,
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

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type CopyState = 'idle' | 'copying' | 'copied' | 'error';
type ApplyState = 'idle' | 'applying' | 'applied' | 'error';

export function TargetsGrid() {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthStart);
  const monthStart = getMonthStart(currentMonth);

  const { data: grid, isLoading } = useMonthlyTargets(monthStart);
  const upsertMutation = useBulkUpsertTargets();
  const copyMutation = useCopyFromPreviousMonth();
  const applyMutation = useApplyToMonths();

  const [dirtyMap, setDirtyMap] = useState<Map<string, number>>(new Map());
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [copyMessage, setCopyMessage] = useState('');
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applyState, setApplyState] = useState<ApplyState>('idle');
  const [applyMessage, setApplyMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const applyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isDirty = dirtyMap.size > 0;

  const handleMonthChange = useCallback((month: Date) => {
    setCurrentMonth(month);
    setDirtyMap(new Map());
    setSaveState('idle');
    setCopyState('idle');
    setApplyState('idle');
    setErrorMessage('');
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
      // Clear saved/error state when user starts editing again
      if (saveState === 'saved' || saveState === 'error') {
        setSaveState('idle');
        setErrorMessage('');
      }
    },
    [saveState]
  );

  async function handleSave() {
    if (!grid || dirtyMap.size === 0) return;
    clearTimeout(saveTimerRef.current);
    setSaveState('saving');
    setErrorMessage('');
    const count = dirtyMap.size;
    const payload = buildUpsertPayload(
      dirtyMap,
      grid.monthStart,
      grid.monthEnd
    );
    try {
      await upsertMutation.mutateAsync(payload);
      setDirtyMap(new Map());
      setSaveState('saved');
      setSaveMessage(`${count} target${count !== 1 ? 's' : ''} saved`);
      saveTimerRef.current = setTimeout(() => setSaveState('idle'), 3000);
    } catch (err) {
      setSaveState('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to save targets'
      );
    }
  }

  async function handleCopy() {
    if (!grid) return;
    clearTimeout(copyTimerRef.current);
    setCopyState('copying');
    const prevMonth = navigateMonth(currentMonth, -1);
    const prevStart = getMonthStart(prevMonth);
    try {
      const result = await copyMutation.mutateAsync({
        sourceMonthStart: prevStart,
        destMonthStart: grid.monthStart,
      });
      setShowCopyConfirm(false);
      setCopyState('copied');
      setCopyMessage(
        !result?.count
          ? 'Nothing to copy'
          : `${result.count} target${result.count !== 1 ? 's' : ''} copied`
      );
      copyTimerRef.current = setTimeout(() => setCopyState('idle'), 3000);
    } catch (err) {
      setShowCopyConfirm(false);
      setCopyState('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to copy targets'
      );
      copyTimerRef.current = setTimeout(() => setCopyState('idle'), 4000);
    }
  }

  function handleDiscard() {
    setDirtyMap(new Map());
    setSaveState('idle');
    setErrorMessage('');
  }

  async function handleApplyToMonths(destMonths: string[], overwrite: boolean) {
    if (!grid) return;
    clearTimeout(applyTimerRef.current);
    setApplyState('applying');
    setErrorMessage('');
    try {
      const result = await applyMutation.mutateAsync({
        sourceMonthStart: grid.monthStart,
        destMonths,
        overwrite,
      });
      setShowApplyDialog(false);
      setApplyState('applied');
      setApplyMessage(
        !result?.count
          ? 'Nothing to apply'
          : `${result.count} target${result.count !== 1 ? 's' : ''} applied to ${destMonths.length} month${destMonths.length !== 1 ? 's' : ''}`
      );
      applyTimerRef.current = setTimeout(() => setApplyState('idle'), 4000);
    } catch (err) {
      setShowApplyDialog(false);
      setApplyState('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to apply targets'
      );
      applyTimerRef.current = setTimeout(() => setApplyState('idle'), 4000);
    }
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
          <div
            className={cn(
              'mt-4 flex items-center gap-3 rounded-lg border p-3 transition-colors duration-300',
              saveState === 'saved' || applyState === 'applied'
                ? 'border-emerald-200 bg-emerald-50'
                : saveState === 'error' || copyState === 'error' || applyState === 'error'
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-white'
            )}
          >
            {/* Copy button with inline state */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCopyConfirm(true)}
              disabled={copyState === 'copying'}
              className={cn(
                'transition-all duration-200',
                copyState === 'copied' &&
                  'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700'
              )}
            >
              {copyState === 'copying' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : copyState === 'copied' ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copyState === 'copied' ? copyMessage : 'Copy from Previous Month'}
            </Button>

            {/* Apply to months button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowApplyDialog(true)}
              disabled={
                applyState === 'applying' ||
                !grid?.regions.some((r) =>
                  r.teams.some((t) =>
                    t.consultants.some(
                      (c) => Object.keys(c.targets).length > 0
                    )
                  )
                )
              }
              className={cn(
                'transition-all duration-200',
                applyState === 'applied' &&
                  'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700'
              )}
            >
              {applyState === 'applying' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : applyState === 'applied' ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <CalendarRange className="mr-2 h-4 w-4" />
              )}
              {applyState === 'applied'
                ? applyMessage
                : 'Apply to Months...'}
            </Button>

            <div className="flex-1" />

            {/* Inline error message */}
            {(saveState === 'error' || copyState === 'error' || applyState === 'error') && errorMessage && (
              <span className="flex items-center gap-1.5 text-sm text-red-600">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                {errorMessage}
              </span>
            )}

            {/* Inline saved confirmation */}
            {saveState === 'saved' && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 animate-in fade-in duration-200">
                <Check className="h-4 w-4" />
                {saveMessage}
              </span>
            )}

            {isDirty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Discard
              </Button>
            )}

            {/* Save button with tri-state */}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={
                (!isDirty && saveState !== 'saved') ||
                saveState === 'saving'
              }
              className={cn(
                'min-w-[140px] transition-all duration-200',
                saveState === 'saved' &&
                  'bg-emerald-600 hover:bg-emerald-600'
              )}
            >
              {saveState === 'saving' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : saveState === 'saved' ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                  {isDirty && (
                    <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">
                      {dirtyMap.size}
                    </span>
                  )}
                </>
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

      {/* Apply to months dialog */}
      <ApplyToMonthsDialog
        open={showApplyDialog}
        onOpenChange={setShowApplyDialog}
        sourceMonth={currentMonth}
        isPending={applyState === 'applying'}
        onApply={handleApplyToMonths}
      />
    </div>
  );
}
