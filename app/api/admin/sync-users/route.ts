/**
 * Bullhorn User Sync API Route
 *
 * POST /api/admin/sync-users
 *
 * Queries SQL Server CorporateUsers and provisions new users into
 * Supabase Auth + user_profiles. Existing users are skipped or updated
 * if their bullhorn_corporate_user_id is missing.
 *
 * Auth: Requires admin role (checked via session cookie + user_profiles).
 * Runtime: Node.js (required for mssql package).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPool, closePool } from '@/lib/sync/sql-server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const TEMP_PASSWORD = 'PotentiaTemp2026!';

// ---------------------------------------------------------------------------
// Role mapping from Bullhorn Occupation → app role
// ---------------------------------------------------------------------------

function mapRole(occupation: string | null): string {
  if (!occupation) return 'consultant';
  const lower = occupation.toLowerCase();

  if (lower.includes('director')) return 'admin';
  if (lower.includes('general manager')) return 'manager';
  if (lower.includes('senior talent manager')) return 'manager';
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
  if (lower.includes('team lead')) return null;
  if (lower.includes('principal')) return 'principal_consultant';
  if (lower.includes('senior')) return 'senior_consultant';
  if (lower.includes('associate')) return 'associate_consultant';
  if (lower.includes('consultant')) return 'consultant';
  return null;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

interface SyncResult {
  created: { email: string; name: string }[];
  updated: { email: string; name: string }[];
  skipped: number;
  errors: { email: string; message: string }[];
}

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

  // 2. Run sync
  const result: SyncResult = { created: [], updated: [], skipped: 0, errors: [] };

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
      profiles.map((p) => [p.email.toLowerCase(), p])
    );
    const existingBullhornIds = new Set(
      profiles
        .filter((p) => p.bullhorn_corporate_user_id)
        .map((p) => p.bullhorn_corporate_user_id)
    );

    // Fetch org_hierarchy for department → team mapping
    const { data: hierarchyNodes } = await supabase
      .from('org_hierarchy')
      .select('id, bullhorn_department_id');
    const deptToNode = new Map(
      (hierarchyNodes ?? [])
        .filter((n) => n.bullhorn_department_id != null)
        .map((n) => [n.bullhorn_department_id, n.id])
    );

    const admin = createAdminClient();

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
          .eq('id', existingProfile.id);

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
          password: TEMP_PASSWORD,
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

    await closePool();

    // 3. Audit log
    await supabase.rpc('write_audit_log', {
      p_action: 'bullhorn_user_sync',
      p_table_name: 'user_profiles',
      p_record_id: null,
      p_old_values: null,
      p_new_values: {
        created: result.created.length,
        updated: result.updated.length,
        skipped: result.skipped,
        errors: result.errors.length,
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    await closePool().catch(() => {});
    const message =
      err instanceof Error ? err.message : 'Unknown error during sync';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
