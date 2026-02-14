import { createClient } from '@/lib/supabase/server';
import { DashboardContent } from './dashboard-content';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <DashboardContent userEmail={user?.email || 'User'} />;
}
