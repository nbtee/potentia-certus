'use server';

import { createClient } from '@/lib/supabase/server';
import type { AuditLogEntry } from '@/lib/admin/types';

type ActionResult<T = void> =
  | { data: T; error?: never }
  | { data?: never; error: string };

async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return null;
  return user.id;
}

// =============================================================================
// List Audit Logs
// =============================================================================

export async function listAuditLogs(filters?: {
  userId?: string;
  action?: string;
  tableName?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}): Promise<ActionResult<{ entries: AuditLogEntry[]; totalCount: number }>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const supabase = await createClient();

  const limit = 50;
  const offset = ((filters?.page ?? 1) - 1) * limit;

  const { data, error } = await supabase.rpc('get_audit_logs', {
    p_limit: limit,
    p_offset: offset,
    p_user_id: filters?.userId ?? null,
    p_action: filters?.action ?? null,
    p_table_name: filters?.tableName ?? null,
    p_date_from: filters?.dateFrom ?? null,
    p_date_to: filters?.dateTo ?? null,
  });

  if (error) return { error: error.message };

  const entries = (data ?? []) as AuditLogEntry[];
  const totalCount = entries.length > 0 ? entries[0].total_count : 0;

  return { data: { entries, totalCount } };
}

// =============================================================================
// Export Audit Log as CSV
// =============================================================================

export async function exportAuditLog(filters?: {
  userId?: string;
  action?: string;
  tableName?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ActionResult<string>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_audit_logs', {
    p_limit: 10000,
    p_offset: 0,
    p_user_id: filters?.userId ?? null,
    p_action: filters?.action ?? null,
    p_table_name: filters?.tableName ?? null,
    p_date_from: filters?.dateFrom ?? null,
    p_date_to: filters?.dateTo ?? null,
  });

  if (error) return { error: error.message };

  const entries = (data ?? []) as AuditLogEntry[];

  const header = 'Timestamp,User,Action,Table,Record ID,Changes';
  const rows = entries.map((e) =>
    [
      e.created_at,
      e.user_email ?? e.user_id ?? '',
      e.action,
      e.table_name ?? '',
      e.record_id ?? '',
      JSON.stringify(e.new_values ?? {}),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );

  return { data: [header, ...rows].join('\n') };
}
