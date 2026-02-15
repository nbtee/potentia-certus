'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  FileText,
  Database,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  userRole: 'consultant' | 'team_lead' | 'manager' | 'admin';
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ('consultant' | 'team_lead' | 'manager' | 'admin')[];
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['consultant', 'team_lead', 'manager', 'admin'],
  },
  {
    name: 'My Performance',
    href: '/performance',
    icon: TrendingUp,
    roles: ['consultant', 'team_lead', 'manager', 'admin'],
  },
  {
    name: 'Team View',
    href: '/team',
    icon: Users,
    roles: ['team_lead', 'manager', 'admin'],
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    roles: ['manager', 'admin'],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
    roles: ['manager', 'admin'],
  },
  {
    name: 'Data Assets',
    href: '/admin/data-assets',
    icon: Database,
    roles: ['admin'],
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    roles: ['admin'],
  },
];

export function AppSidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  // Filter navigation items based on user role
  const visibleNavItems = navigation.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800 px-4">
        <h1 className="text-xl font-bold text-white">Potentia Certus</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-4">
        <div className="text-xs text-gray-400">
          <div className="font-medium text-gray-300 mb-1">Role: {userRole}</div>
          <div>v1.0.0 • Stage B</div>
        </div>
      </div>
    </div>
  );
}
