import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { EnhancedHeader } from '@/components/enhanced-header';

export default async function PerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, first_name, last_name, display_name')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || 'consultant';
  const userName =
    profile?.display_name ||
    (profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : undefined);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AppSidebar userRole={userRole} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <EnhancedHeader userEmail={user.email || ''} userName={userName} />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100/50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
