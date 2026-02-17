import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { DashboardView } from './dashboard-view';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardViewPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  // Fetch dashboard with widgets (server-side for initial data)
  const { data: dashboard, error } = await supabase
    .from('dashboards')
    .select(
      `
      *,
      dashboard_widgets (
        *,
        data_assets:data_asset_id (
          asset_key,
          display_name,
          output_shapes,
          category
        )
      )
    `
    )
    .eq('id', id)
    .single();

  if (error || !dashboard) notFound();

  // Fetch user profile for role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const validRoles = ['consultant', 'team_lead', 'manager', 'admin'] as const;
  type UserRole = (typeof validRoles)[number];
  const userRole: UserRole = validRoles.includes(profile?.role as UserRole)
    ? (profile?.role as UserRole)
    : 'consultant';
  const isOwner = dashboard.owner_id === user.id;

  // Flatten joined data_assets
  const dashboardWithWidgets = {
    ...dashboard,
    dashboard_widgets: (dashboard.dashboard_widgets || []).map(
      (w: Record<string, unknown>) => ({
        ...w,
        data_asset: w.data_assets,
      })
    ),
  };

  return (
    <DashboardView
      initialDashboard={dashboardWithWidgets}
      isOwner={isOwner}
      userRole={userRole}
    />
  );
}
