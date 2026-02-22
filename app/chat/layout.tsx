import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { EnhancedHeader } from '@/components/enhanced-header';

export default async function ChatLayout({
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

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role, first_name, last_name, display_name')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Failed to load user profile:', profileError.message);
  }

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
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
