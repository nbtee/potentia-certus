'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useInviteUser } from '@/lib/admin/hooks';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CSVRow {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  error?: string;
}

const REQUIRED_COLUMNS = ['email', 'first_name', 'last_name', 'role'];
const VALID_ROLES = ['consultant', 'team_lead', 'manager', 'admin'];

export function CSVImportDialog({ open, onOpenChange }: CSVImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const inviteMutation = useInviteUser();
  const [rows, setRows] = useState<CSVRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setResults(null);
    setProgress(0);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        // Validate columns
        const headers = result.meta.fields ?? [];
        const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));

        if (missing.length > 0) {
          setRows([
            {
              email: '',
              first_name: '',
              last_name: '',
              role: '',
              error: `Missing columns: ${missing.join(', ')}`,
            },
          ]);
          return;
        }

        // Validate rows
        const validated: CSVRow[] = result.data.map((row) => {
          const csvRow: CSVRow = {
            email: row.email?.trim() ?? '',
            first_name: row.first_name?.trim() ?? '',
            last_name: row.last_name?.trim() ?? '',
            role: row.role?.trim().toLowerCase() ?? '',
          };

          if (!csvRow.email || !csvRow.email.includes('@')) {
            csvRow.error = 'Invalid email';
          } else if (!csvRow.first_name) {
            csvRow.error = 'Missing first name';
          } else if (!csvRow.last_name) {
            csvRow.error = 'Missing last name';
          } else if (!VALID_ROLES.includes(csvRow.role)) {
            csvRow.error = `Invalid role. Must be: ${VALID_ROLES.join(', ')}`;
          }

          return csvRow;
        });

        setRows(validated);
      },
    });
  }

  async function handleImport() {
    const validRows = rows.filter((r) => !r.error);
    if (validRows.length === 0) return;

    setImporting(true);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await inviteMutation.mutateAsync({
          email: row.email,
          first_name: row.first_name,
          last_name: row.last_name,
          role: row.role as 'consultant' | 'team_lead' | 'manager' | 'admin',
        });
        success++;
      } catch {
        failed++;
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImporting(false);
    setResults({ success, failed });
  }

  const validCount = rows.filter((r) => !r.error).length;
  const errorCount = rows.filter((r) => r.error).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Users from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File input */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose CSV File
            </Button>
            <p className="mt-1 text-xs text-gray-500">
              Required columns: email, first_name, last_name, role
            </p>
          </div>

          {/* Preview table */}
          {rows.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow
                      key={i}
                      className={row.error ? 'bg-red-50' : ''}
                    >
                      <TableCell className="text-sm">{row.email}</TableCell>
                      <TableCell className="text-sm">
                        {row.first_name} {row.last_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {row.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.error ? (
                          <span className="flex items-center gap-1 text-xs text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            {row.error}
                          </span>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary */}
          {rows.length > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-600">{validCount} valid</span>
              {errorCount > 0 && (
                <span className="text-red-600">{errorCount} errors</span>
              )}
            </div>
          )}

          {/* Progress */}
          {importing && <Progress value={progress} />}

          {/* Results */}
          {results && (
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-green-600">{results.success} users imported successfully</p>
              {results.failed > 0 && (
                <p className="text-red-600">{results.failed} failed</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {results ? 'Close' : 'Cancel'}
          </Button>
          {!results && (
            <Button
              onClick={handleImport}
              disabled={importing || validCount === 0}
            >
              {importing ? `Importing... ${progress}%` : `Import ${validCount} Users`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
