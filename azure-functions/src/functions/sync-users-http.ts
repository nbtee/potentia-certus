import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { createClient } from '@supabase/supabase-js';
import { getPool, closePool } from '../shared/sql-server.js';

interface SyncUserResult {
  created: { email: string; name: string }[];
  updated: { email: string; name: string }[];
  skipped: number;
  errors: { email: string; message: string }[];
}

// ---------------------------------------------------------------------------
// Role mapping from Bullhorn Occupation → app role
// ---------------------------------------------------------------------------

function mapRole(occupation: string | null): string {
  if (!occupation) return 'consultant';
  const lower = occupation.toLowerCase();

  if (lower.includes('director')) return 'admin';
  if (lower.includes('general manager')) return 'manager';
  if (lower.includes('senior talent manager')) return 'manager';
  if (lower.includes('national account executive')) return 'consultant';
  if (lower.includes('talent delivery lead')) return 'team_lead';
  if (lower.includes('talent manager')) return 'team_lead';
  if (lower.includes('delivery lead')) return 'team_lead';
  if (lower.includes('team lead')) return 'team_lead';
  return 'consultant';
}

// ---------------------------------------------------------------------------
// Title mapping from Bullhorn Occupation → user_profiles.title enum
// ---------------------------------------------------------------------------

function mapTitle(occupation: string | null): string | null {
  if (!occupation) return null;
  const lower = occupation.toLowerCase();

  if (lower.includes('director')) return 'director';
  if (lower.includes('general manager')) return 'general_manager';
  if (lower.includes('senior talent manager')) return 'senior_talent_manager';
  if (lower.includes('talent delivery lead')) return 'talent_delivery_lead';
  if (lower.includes('talent manager')) return 'talent_manager';
  if (lower.includes('delivery lead')) return 'delivery_lead';
  if (lower.includes('national account executive')) return 'national_account_executive';
  if (lower.includes('team lead')) return null;
  if (lower.includes('principal')) return 'principal_consultant';
  if (lower.includes('senior')) return 'senior_consultant';
  if (lower.includes('associate')) return 'associate_consultant';
  if (lower.includes('consultant')) return 'consultant';
  return null;
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

async function syncUsers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('User sync triggered');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tempPassword = process.env.TEMP_USER_PASSWORD;
  if (!tempPassword) {
    context.error('TEMP_USER_PASSWORD not configured');
    return { status: 500, jsonBody: { error: 'Server configuration error' } };
  }

  // Concurrency guard: check for running user sync less than 5 min old
  const { data: runningSync } = await supabase
    .from('ingestion_runs')
    .select('id, started_at')
    .eq('status', 'running')
    .eq('run_type', 'user_sync')
    .gte('started_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .limit(1);

  if (runningSync && runningSync.length > 0) {
    return {
      status: 409,
      jsonBody: { error: 'User sync already running', run_id: runningSync[0].id },
    };
  }

  // Log run start
  const { data: runRecord } = await supabase
    .from('ingestion_runs')
    .insert({
      run_type: 'user_sync',
      source_table: 'TargetJobsDB.CorporateUsers',
      target_table: 'user_profiles',
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  const runId = runRecord?.id;
  const result: SyncUserResult = { created: [], updated: [], skipped: 0, errors: [] };

  try {
    const pool = await getPool();

    // Fetch CorporateUsers from SQL Server
    const sqlResult = await pool.request().query(
      `SELECT Id, IdInDataSrc, Name, Email, Occupation, DepartmentId
       FROM TargetJobsDB.CorporateUsers`
    );

    // Fetch existing profiles
    const { data: existingProfiles } = await supabase
      .from('user_profiles')
      .select('id, email, bullhorn_corporate_user_id');
    const profiles = existingProfiles ?? [];

    const existingEmails = new Map(
      profiles.map((p: Record<string, unknown>) => [(p.email as string).toLowerCase(), p])
    );
    const existingBullhornIds = new Set(
      profiles
        .filter((p: Record<string, unknown>) => p.bullhorn_corporate_user_id)
        .map((p: Record<string, unknown>) => p.bullhorn_corporate_user_id)
    );

    // Fetch org_hierarchy for department → team mapping
    const { data: hierarchyNodes } = await supabase
      .from('org_hierarchy')
      .select('id, bullhorn_department_id');
    const deptToNode = new Map(
      (hierarchyNodes ?? [])
        .filter((n: Record<string, unknown>) => n.bullhorn_department_id != null)
        .map((n: Record<string, unknown>) => [n.bullhorn_department_id, n.id])
    );

    // Admin client for creating auth users
    const admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    for (const sqlUser of sqlResult.recordset) {
      const email = (sqlUser.Email || '').trim().toLowerCase();

      // Skip users with no email or blank username
      if (!email || email.startsWith('@')) {
        result.skipped++;
        continue;
      }

      // Split name
      const nameParts = (sqlUser.Name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || null;
      const lastName =
        nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
      const role = mapRole(sqlUser.Occupation);
      const title = mapTitle(sqlUser.Occupation);
      const hierarchyNodeId = deptToNode.get(sqlUser.DepartmentId) ?? null;

      // Already mapped by bullhorn ID — skip
      if (existingBullhornIds.has(sqlUser.Id)) {
        result.skipped++;
        continue;
      }

      // Email exists but bullhorn ID not set — update profile
      const existingProfile = existingEmails.get(email);
      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            bullhorn_corporate_user_id: sqlUser.Id,
            bullhorn_native_id: sqlUser.IdInDataSrc || null,
            first_name: firstName,
            last_name: lastName,
            display_name: sqlUser.Name,
            role,
            ...(title && { title }),
            ...(hierarchyNodeId && { hierarchy_node_id: hierarchyNodeId }),
          })
          .eq('id', (existingProfile as Record<string, unknown>).id);

        if (updateError) {
          result.errors.push({
            email,
            message: `Update failed: ${updateError.message}`,
          });
        } else {
          result.updated.push({ email, name: sqlUser.Name });
        }
        continue;
      }

      // Brand new user — create auth entry + update profile
      const { data: authData, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: sqlUser.Name,
            bullhorn_id: sqlUser.Id,
          },
        });

      if (createError) {
        result.errors.push({
          email,
          message: `Auth creation failed: ${createError.message}`,
        });
        continue;
      }

      // Update the auto-created profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          bullhorn_corporate_user_id: sqlUser.Id,
          bullhorn_native_id: sqlUser.IdInDataSrc || null,
          first_name: firstName,
          last_name: lastName,
          display_name: sqlUser.Name,
          role,
          ...(title && { title }),
          ...(hierarchyNodeId && { hierarchy_node_id: hierarchyNodeId }),
        })
        .eq('id', authData.user.id);

      if (profileError) {
        result.errors.push({
          email,
          message: `Profile update failed: ${profileError.message}`,
        });
      } else {
        result.created.push({ email, name: sqlUser.Name });
      }
    }

    // Update run record
    if (runId) {
      await supabase
        .from('ingestion_runs')
        .update({
          records_processed: result.created.length + result.updated.length + result.skipped + result.errors.length,
          records_inserted: result.created.length,
          records_failed: result.errors.length,
          status: result.errors.length === 0 ? 'completed' : 'partial',
          completed_at: new Date().toISOString(),
          metadata: {
            created: result.created.length,
            updated: result.updated.length,
            skipped: result.skipped,
            errors: result.errors.length,
          },
        })
        .eq('id', runId);
    }

    context.log(
      `User sync complete: ${result.created.length} created, ${result.updated.length} updated, ${result.skipped} skipped, ${result.errors.length} errors`
    );

    return { status: 200, jsonBody: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    context.error('User sync failed:', message);

    // Update run record with failure
    if (runId) {
      await supabase
        .from('ingestion_runs')
        .update({
          status: 'failed',
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId);
    }

    // Return generic error — don't expose SQL details to caller
    return {
      status: 500,
      jsonBody: { error: 'User sync failed. Check Azure Function logs for details.' },
    };
  } finally {
    await closePool().catch(() => {});
  }
}

app.http('sync-users', {
  methods: ['POST'],
  authLevel: 'function',
  handler: syncUsers,
});
