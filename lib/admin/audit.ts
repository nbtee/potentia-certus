'use server';

import { createClient } from '@/lib/supabase/server';

export async function writeAuditLog(
  action: string,
  tableName?: string,
  recordId?: string,
  oldValues?: Record<string, unknown> | null,
  newValues?: Record<string, unknown> | null
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('write_audit_log', {
    p_action: action,
    p_table_name: tableName ?? null,
    p_record_id: recordId ?? null,
    p_old_values: oldValues ?? null,
    p_new_values: newValues ?? null,
  });

  if (error) {
    console.error('Failed to write audit log:', error.message);
  }
}
