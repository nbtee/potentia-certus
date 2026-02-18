'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import {
  Users,
  Network,
  Database,
  MessageSquareWarning,
  Activity,
} from 'lucide-react';

interface AdminOverviewProps {
  userCount: number;
  hierarchyCount: number;
  dataAssetCount: number;
  pendingSynonymCount: number;
  lastSyncStatus: string | null;
  lastSyncTime: string | null;
}

const cards = [
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    countKey: 'userCount' as const,
    color: 'text-teal-600 bg-teal-50',
  },
  {
    title: 'Hierarchy Nodes',
    href: '/admin/hierarchy',
    icon: Network,
    countKey: 'hierarchyCount' as const,
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    title: 'Data Assets',
    href: '/admin/data-assets',
    icon: Database,
    countKey: 'dataAssetCount' as const,
    color: 'text-purple-600 bg-purple-50',
  },
  {
    title: 'Pending Synonyms',
    href: '/admin/synonyms',
    icon: MessageSquareWarning,
    countKey: 'pendingSynonymCount' as const,
    color: 'text-amber-600 bg-amber-50',
  },
];

export function AdminOverview({
  userCount,
  hierarchyCount,
  dataAssetCount,
  pendingSynonymCount,
  lastSyncStatus,
  lastSyncTime,
}: AdminOverviewProps) {
  const counts = { userCount, hierarchyCount, dataAssetCount, pendingSynonymCount };

  return (
    <div>
      <AdminPageHeader
        title="Administration"
        description="Manage users, hierarchy, business rules, and system configuration."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {card.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{counts[card.countKey]}</div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {/* Ingestion status card */}
        <Link href="/admin/ingestion">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Last Sync
              </CardTitle>
              <div className="rounded-lg bg-gray-50 p-2 text-gray-600">
                <Activity className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {lastSyncStatus ? (
                <div className="flex items-center gap-2">
                  <Badge
                    variant={lastSyncStatus === 'completed' ? 'default' : 'destructive'}
                    className={
                      lastSyncStatus === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : ''
                    }
                  >
                    {lastSyncStatus}
                  </Badge>
                  {lastSyncTime && (
                    <span className="text-xs text-gray-400">
                      {new Date(lastSyncTime).toLocaleString()}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-gray-400">No syncs yet</span>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
