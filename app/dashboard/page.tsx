import { createClient } from '@/lib/supabase/server';
import { DashboardContent } from './dashboard-content';
import { EnhancedFilterBar } from '@/components/enhanced-filter-bar';
import { DashboardWrapper } from './dashboard-wrapper';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user profile to get role and hierarchy
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, hierarchy_node_id')
    .eq('id', user?.id)
    .single();

  return (
    <DashboardWrapper
      userId={user?.id ?? ''}
      userHierarchyNodeId={profile?.hierarchy_node_id ?? null}
    >
      <div className="space-y-6">
        <EnhancedFilterBar />
        <DashboardContent />
      </div>
    </DashboardWrapper>
  );
}
