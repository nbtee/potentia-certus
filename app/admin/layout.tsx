import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { EnhancedHeader } from '@/components/enhanced-header';

export default async function AdminLayout({
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

  // Role gate: only admin and manager can access
  if (userRole !== 'admin' && userRole !== 'manager') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-500">
            You do not have permission to access the administration area.
          </p>
          <a href="/dashboard" className="mt-4 inline-block text-sm text-primary hover:underline">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

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
          {userRole === 'manager' && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              Read-only access. Contact an administrator for write permissions.
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
