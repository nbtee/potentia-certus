import { createClient } from '@/lib/supabase/server';
import { DashboardContent } from './dashboard-content';
import { GlobalFilterBar } from '@/components/global-filter-bar';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user profile to get role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user?.id)
    .single();

  const userRole = profile?.role || 'consultant';

  return (
    <div className="space-y-6">
      <GlobalFilterBar userRole={userRole} />
      <DashboardContent userEmail={user?.email || 'User'} />
    </div>
  );
}
