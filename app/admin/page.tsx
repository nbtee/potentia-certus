import { createClient } from '@/lib/supabase/server';
import { AdminOverview } from './admin-overview';

export default async function AdminPage() {
  const supabase = await createClient();

  const [users, hierarchy, dataAssets, synonyms, ingestion] = await Promise.all([
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('org_hierarchy').select('id', { count: 'exact', head: true }),
    supabase.from('data_assets').select('id', { count: 'exact', head: true }),
    supabase
      .from('unmatched_terms')
      .select('id', { count: 'exact', head: true })
      .eq('resolution_status', 'pending'),
    supabase
      .from('ingestion_runs')
      .select('status, completed_at')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single(),
  ]);

  return (
    <AdminOverview
      userCount={users.count ?? 0}
      hierarchyCount={hierarchy.count ?? 0}
      dataAssetCount={dataAssets.count ?? 0}
      pendingSynonymCount={synonyms.count ?? 0}
      lastSyncStatus={ingestion.data?.status ?? null}
      lastSyncTime={ingestion.data?.completed_at ?? null}
    />
  );
}
