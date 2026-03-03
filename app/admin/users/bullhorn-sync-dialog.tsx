'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { adminKeys } from '@/lib/admin/hooks';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BullhornSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SyncResult {
  created: { email: string; name: string }[];
  updated: { email: string; name: string }[];
  skipped: number;
  errors: { email: string; message: string }[];
}

type SyncState = 'idle' | 'syncing' | 'done' | 'error';

export function BullhornSyncDialog({
  open,
  onOpenChange,
}: BullhornSyncDialogProps) {
  const qc = useQueryClient();
  const [state, setState] = useState<SyncState>('idle');
  const [result, setResult] = useState<SyncResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSync() {
    setState('syncing');
    setResult(null);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/admin/sync-users', {
        method: 'POST',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${response.status}`);
      }

      const data: SyncResult = await response.json();
      setResult(data);
      setState('done');

      qc.invalidateQueries({ queryKey: adminKeys.users });

      if (data.created.length > 0 || data.updated.length > 0) {
        toast.success(
          `Sync complete: ${data.created.length} created, ${data.updated.length} updated`
        );
      } else {
        toast.info('Sync complete: no new users found');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Sync failed unexpectedly';
      setErrorMessage(message);
      setState('error');
      toast.error(`Sync failed: ${message}`);
    }
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen && state !== 'syncing') {
      // Reset state when closing
      setState('idle');
      setResult(null);
      setErrorMessage(null);
      onOpenChange(false);
    }
  }

  const changedUsers = [
    ...(result?.created.map((u) => ({ ...u, action: 'Created' as const })) ??
      []),
    ...(result?.updated.map((u) => ({ ...u, action: 'Updated' as const })) ??
      []),
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Sync Users from Bullhorn</DialogTitle>
          <DialogDescription>
            {state === 'idle' &&
              'Query SQL Server for new or changed CorporateUsers and provision them into the app.'}
            {state === 'syncing' && 'Connecting to Bullhorn and syncing users...'}
            {state === 'done' && 'Sync completed successfully.'}
            {state === 'error' && 'An error occurred during sync.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Syncing state */}
          {state === 'syncing' && (
            <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Syncing users from Bullhorn...
            </div>
          )}

          {/* Error state */}
          {state === 'error' && errorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          {/* Results summary */}
          {state === 'done' && result && (
            <>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>
                  <strong>{result.created.length}</strong> created,{' '}
                  <strong>{result.updated.length}</strong> updated,{' '}
                  <strong>{result.skipped}</strong> skipped
                </span>
              </div>

              {/* Changed users table */}
              {changedUsers.length > 0 && (
                <div className="max-h-64 overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changedUsers.map((u) => (
                        <TableRow key={u.email}>
                          <TableCell className="text-sm font-medium">
                            {u.name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.email}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                u.action === 'Created'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }
                            >
                              {u.action}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Errors list */}
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-600">
                    {result.errors.length} error
                    {result.errors.length !== 1 && 's'}:
                  </p>
                  <div className="max-h-32 overflow-auto rounded-lg border border-red-200 bg-red-50 p-2">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-700">
                        {e.email}: {e.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {state === 'idle' && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleSync}>Start Sync</Button>
            </>
          )}
          {state === 'done' && (
            <Button onClick={() => handleClose(false)}>Close</Button>
          )}
          {state === 'error' && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Close
              </Button>
              <Button onClick={handleSync}>Retry</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
