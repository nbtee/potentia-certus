/**
 * Bullhorn User Sync API Route (Proxy to Azure Function)
 *
 * POST /api/admin/sync-users
 *
 * Authenticates admin session, then proxies the request to the Azure Function
 * which handles SQL Server connectivity and user provisioning.
 *
 * Auth: Requires admin role (checked via session cookie + user_profiles).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 120;

export async function POST() {
  // 1. Authenticate — must be admin
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  // 2. Proxy to Azure Function
  const azureUrl = process.env.AZURE_SYNC_USERS_URL;
  const azureKey = process.env.AZURE_FUNCTION_KEY;

  if (!azureUrl || !azureKey) {
    console.error('Missing AZURE_SYNC_USERS_URL or AZURE_FUNCTION_KEY');
    return NextResponse.json(
      { error: 'Sync service not configured' },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'x-functions-key': azureKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(100_000),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Azure Function error:', response.status, data);
      return NextResponse.json(
        { error: 'User sync failed. Check server logs for details.' },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    // 3. Audit log
    await supabase.rpc('write_audit_log', {
      p_action: 'bullhorn_user_sync',
      p_table_name: 'user_profiles',
      p_record_id: null,
      p_old_values: null,
      p_new_values: {
        created: data.created?.length ?? 0,
        updated: data.updated?.length ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors?.length ?? 0,
      },
    });

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error during sync';
    console.error('Sync proxy error:', message);
    return NextResponse.json(
      { error: 'User sync failed. Check server logs for details.' },
      { status: 502 }
    );
  }
}
