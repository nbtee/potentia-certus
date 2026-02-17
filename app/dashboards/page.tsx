import { DashboardList } from './dashboard-list';

export default function DashboardsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Dashboards</h1>
        <p className="mt-2 text-gray-600">
          Create, manage, and share your custom dashboards
        </p>
      </div>
      <DashboardList />
    </div>
  );
}
