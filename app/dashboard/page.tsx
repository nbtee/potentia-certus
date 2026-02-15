import { createClient } from '@/lib/supabase/server';
import { DashboardContent } from './dashboard-content';
import { EnhancedFilterBar } from '@/components/enhanced-filter-bar';

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
      <EnhancedFilterBar userRole={userRole} />
      <DashboardContent />
    </div>
  );
}
