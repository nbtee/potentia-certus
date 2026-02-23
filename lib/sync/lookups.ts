import { createClient } from '@supabase/supabase-js';
import type { LookupMaps } from './types';

const PAGE_SIZE = 1000;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Supabase untyped client returns `any` rows — this is intentional for generic table access
async function fetchAll(table: string, columns: string) {
  const supabase = getServiceClient();
  const allRows: Record<string, any>[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      console.error(`  Error fetching ${table}: ${error.message}`);
      break;
    }
    allRows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return allRows;
}

export { getServiceClient, fetchAll };

export async function buildLookupMaps(): Promise<LookupMaps> {
  const maps: LookupMaps = {
    consultants: new Map(),
    candidates: new Map(),
    jobOrders: new Map(),
    clientCorporations: new Map(),
  };

  // Consultants: bullhorn_corporate_user_id → uuid
  const users = await fetchAll('user_profiles', 'id, bullhorn_corporate_user_id');
  users
    .filter((u) => u.bullhorn_corporate_user_id != null)
    .forEach((u) => {
      maps.consultants.set(
        u.bullhorn_corporate_user_id as number,
        u.id as string
      );
    });
  console.log(`  Lookup: ${maps.consultants.size} consultants`);

  // Candidates: bullhorn_id → uuid
  const cands = await fetchAll('candidates', 'id, bullhorn_id');
  cands.forEach((r) => maps.candidates.set(r.bullhorn_id as number, r.id as string));
  console.log(`  Lookup: ${maps.candidates.size} candidates`);

  // Job orders: bullhorn_id → uuid
  const jobs = await fetchAll('job_orders', 'id, bullhorn_id');
  jobs.forEach((r) => maps.jobOrders.set(r.bullhorn_id as number, r.id as string));
  console.log(`  Lookup: ${maps.jobOrders.size} job orders`);

  // Client corporations: bullhorn_id → uuid
  const clients = await fetchAll('client_corporations', 'id, bullhorn_id');
  clients.forEach((r) => maps.clientCorporations.set(r.bullhorn_id as number, r.id as string));
  console.log(`  Lookup: ${maps.clientCorporations.size} client corporations`);

  return maps;
}
