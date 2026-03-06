import type sql from 'mssql';
import type { LookupMaps, SyncResult } from './types.js';
import { getServiceClient } from './lookups.js';

const BATCH_SIZE = 500;

async function upsertBatch(
  table: string,
  rows: Record<string, unknown>[],
  conflictColumn: string
): Promise<{ inserted: number; errors: number }> {
  if (rows.length === 0) return { inserted: 0, errors: 0 };

  const supabase = getServiceClient();
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch, {
      onConflict: conflictColumn,
      ignoreDuplicates: false,
    });

    if (error) {
      console.error(
        `  ERROR in ${table} batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`
      );
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, errors };
}

// ============================================================================
// Activities (Notes WHERE isDeleted = 0)
// ============================================================================

export async function syncActivities(
  pool: sql.ConnectionPool,
  lookups: LookupMaps,
  since: string | null
): Promise<SyncResult> {
  const start = Date.now();
  const request = pool.request();

  let query = `
    SELECT Id, action, dateAdded, CorporateUserId, personReferenceId, JobOrderId, comments
    FROM TargetJobsDB.Notes
    WHERE isDeleted = 0`;

  if (since) {
    request.input('since', since);
    query += ` AND dateAdded > @since`;
  }

  const result = await request.query(query);

  const rows = result.recordset.map((r: Record<string, unknown>) => ({
    bullhorn_id: r.Id,
    activity_type: (r.action as string) || 'Unknown',
    consultant_id: lookups.consultants.get(r.CorporateUserId as number) || null,
    candidate_id: lookups.candidates.get(r.personReferenceId as number) || null,
    job_order_id: lookups.jobOrders.get(r.JobOrderId as number) || null,
    activity_date: new Date(r.dateAdded as string).toISOString(),
    notes: (r.comments as string) || null,
    synced_at: new Date().toISOString(),
  }));

  const stats = await upsertBatch('activities', rows, 'bullhorn_id');
  console.log(
    `  activities: ${stats.inserted} upserted, ${stats.errors} errors (${Date.now() - start}ms)`
  );

  return {
    table: 'activities',
    processed: rows.length,
    inserted: stats.inserted,
    errors: stats.errors,
    duration_ms: Date.now() - start,
  };
}

// ============================================================================
// Submissions (SubmissionHistory + Submissions join)
// ============================================================================

export async function syncSubmissions(
  pool: sql.ConnectionPool,
  lookups: LookupMaps,
  since: string | null
): Promise<SyncResult> {
  const start = Date.now();
  const request = pool.request();

  let query = `
    SELECT h.id AS history_id,
           h.SubmissionId,
           h.status,
           h.comments,
           h.dateAdded,
           h.CorporateUserId,
           COALESCE(s.PersonId, s.BadPersonId) AS CandidateId,
           s.JobOrderId
    FROM TargetJobsDB.SubmissionHistory h
    LEFT JOIN TargetJobsDB.Submissions s ON h.SubmissionId = s.Id`;

  if (since) {
    request.input('since', since);
    query += ` WHERE h.dateAdded > @since`;
  }

  const result = await request.query(query);

  const rows = result.recordset.map((r: Record<string, unknown>) => ({
    bullhorn_submission_id: r.SubmissionId,
    bullhorn_submission_history_id: r.history_id,
    candidate_id: lookups.candidates.get(r.CandidateId as number) || null,
    job_order_id: lookups.jobOrders.get(r.JobOrderId as number) || null,
    consultant_id: lookups.consultants.get(r.CorporateUserId as number) || null,
    status_to: (r.status as string) || 'Unknown',
    detected_at: new Date(r.dateAdded as string).toISOString(),
    comments: (r.comments as string) || null,
    synced_at: new Date().toISOString(),
  }));

  const stats = await upsertBatch(
    'submission_status_log',
    rows,
    'bullhorn_submission_history_id'
  );
  console.log(
    `  submissions: ${stats.inserted} upserted, ${stats.errors} errors (${Date.now() - start}ms)`
  );

  return {
    table: 'submission_status_log',
    processed: rows.length,
    inserted: stats.inserted,
    errors: stats.errors,
    duration_ms: Date.now() - start,
  };
}

// ============================================================================
// Placements
// ============================================================================

export async function syncPlacements(
  pool: sql.ConnectionPool,
  lookups: LookupMaps,
  since: string | null
): Promise<SyncResult> {
  const start = Date.now();
  const request = pool.request();

  let query = `
    SELECT Id, OwnerId, CandidateId, DateAdded, Status, PlacementPutDate,
           DateBegin, EmploymentType, JobOrderId, Margin, SalaryUnit,
           DateEnd, fee, payRate, salary, hoursPerDay, customInt2
    FROM TargetJobsDB.Placements`;

  if (since) {
    request.input('since', since);
    query += ` WHERE DateAdded > @since`;
  }

  const result = await request.query(query);

  const rows = result.recordset.map((r: Record<string, unknown>) => {
    let revenueType = 'contract';
    if (r.EmploymentType) {
      const lower = (r.EmploymentType as string).toLowerCase();
      if (lower.includes('perm')) revenueType = 'permanent';
    }

    let feeAmount: number | null = null;
    let gpPerHour: number | null = null;

    if (revenueType === 'permanent') {
      feeAmount = (r.fee as number) || (r.Margin as number) || 0;
    } else {
      if (r.Margin) {
        gpPerHour =
          r.SalaryUnit && (r.SalaryUnit as string).toLowerCase() === 'daily'
            ? (r.Margin as number) / 8
            : (r.Margin as number);
      } else {
        gpPerHour = 0;
      }
    }

    const dateBegin =
      r.DateBegin && (r.DateBegin as Date).getFullYear() > 1900
        ? (r.DateBegin as Date).toISOString().split('T')[0]
        : null;
    const dateEnd =
      r.DateEnd && (r.DateEnd as Date).getFullYear() > 1900
        ? (r.DateEnd as Date).toISOString().split('T')[0]
        : null;
    const placementDate = r.DateAdded
      ? (r.DateAdded as Date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    return {
      bullhorn_id: r.Id,
      consultant_id: lookups.consultants.get(r.OwnerId as number) || null,
      candidate_id: lookups.candidates.get(r.CandidateId as number) || null,
      job_order_id: lookups.jobOrders.get(r.JobOrderId as number) || null,
      revenue_type: revenueType,
      fee_amount: feeAmount,
      gp_per_hour: gpPerHour,
      candidate_salary: (r.salary as number) || null,
      start_date: dateBegin,
      end_date: dateEnd,
      placement_date: placementDate,
      hours_per_day: (r.hoursPerDay as number) ?? null,
      working_days_per_week: (r.customInt2 as number) ?? null,
      metadata: {
        status: r.Status,
        salary_unit: r.SalaryUnit,
        pay_rate: r.payRate,
        employment_type_raw: r.EmploymentType,
      },
      synced_at: new Date().toISOString(),
    };
  });

  const stats = await upsertBatch('placements', rows, 'bullhorn_id');
  console.log(
    `  placements: ${stats.inserted} upserted, ${stats.errors} errors (${Date.now() - start}ms)`
  );

  return {
    table: 'placements',
    processed: rows.length,
    inserted: stats.inserted,
    errors: stats.errors,
    duration_ms: Date.now() - start,
  };
}

// ============================================================================
// Job Orders
// ============================================================================

export async function syncJobOrders(
  pool: sql.ConnectionPool,
  lookups: LookupMaps,
  since: string | null
): Promise<SyncResult> {
  const start = Date.now();
  const request = pool.request();

  let query = `
    SELECT Id, Title, DateAdded, DateLastModified, ClientCorporationId, OwnerId, employmentType, Status
    FROM TargetJobsDB.JobOrders`;

  if (since) {
    request.input('since', since);
    query += ` WHERE DateLastModified > @since`;
  }

  const result = await request.query(query);

  const rows = result.recordset.map((r: Record<string, unknown>) => {
    let empType: string | null = null;
    if (r.employmentType) {
      const lower = (r.employmentType as string).toLowerCase();
      if (lower.includes('perm')) empType = 'Permanent';
      else if (lower.includes('contract') || lower.includes('fixed'))
        empType = 'Contract';
    }

    return {
      bullhorn_id: r.Id,
      title: (r.Title as string) || 'Untitled',
      consultant_id: lookups.consultants.get(r.OwnerId as number) || null,
      client_corporation_id:
        lookups.clientCorporations.get(r.ClientCorporationId as number) || null,
      employment_type: empType,
      date_added: r.DateAdded
        ? new Date(r.DateAdded as string).toISOString()
        : null,
      date_last_modified: r.DateLastModified
        ? new Date(r.DateLastModified as string).toISOString()
        : null,
      status: (r.Status as string) || null,
      synced_at: new Date().toISOString(),
    };
  });

  const stats = await upsertBatch('job_orders', rows, 'bullhorn_id');
  console.log(
    `  job_orders: ${stats.inserted} upserted, ${stats.errors} errors (${Date.now() - start}ms)`
  );

  return {
    table: 'job_orders',
    processed: rows.length,
    inserted: stats.inserted,
    errors: stats.errors,
    duration_ms: Date.now() - start,
  };
}
