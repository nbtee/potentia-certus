'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  FileText,
  Database,
  TrendingUp,
  Layers,
  Shield,
  Network,
  Target,
  BookOpen,
  MessageSquareWarning,
  Activity,
  ScrollText,
  Sliders,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  userRole: 'consultant' | 'team_lead' | 'manager' | 'admin';
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ('consultant' | 'team_lead' | 'manager' | 'admin')[];
  badge?: string;
  section?: string;
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['consultant', 'team_lead', 'manager', 'admin'],
  },
  {
    name: 'My Dashboards',
    href: '/dashboards',
    icon: Layers,
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
    badge: 'New',
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
    roles: ['manager', 'admin'],
  },
  // Administration section
  {
    name: 'Admin Overview',
    href: '/admin',
    icon: Shield,
    roles: ['manager', 'admin'],
    section: 'Administration',
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    name: 'Hierarchy',
    href: '/admin/hierarchy',
    icon: Network,
    roles: ['admin'],
  },
  {
    name: 'Business Rules',
    href: '/admin/rules',
    icon: Sliders,
    roles: ['admin'],
  },
  {
    name: 'Targets',
    href: '/admin/targets',
    icon: Target,
    roles: ['manager', 'admin'],
  },
  {
    name: 'Data Assets',
    href: '/admin/data-assets',
    icon: Database,
    roles: ['admin'],
  },
  {
    name: 'Context Docs',
    href: '/admin/context-docs',
    icon: BookOpen,
    roles: ['admin'],
  },
  {
    name: 'Synonyms',
    href: '/admin/synonyms',
    icon: MessageSquareWarning,
    roles: ['admin'],
  },
  {
    name: 'Ingestion',
    href: '/admin/ingestion',
    icon: Activity,
    roles: ['manager', 'admin'],
  },
  {
    name: 'Audit Log',
    href: '/admin/audit-log',
    icon: ScrollText,
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

  // Role display names
  const roleLabels = {
    consultant: 'Consultant',
    team_lead: 'Team Lead',
    manager: 'Manager',
    admin: 'Administrator',
  };

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex h-full w-64 flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 shadow-2xl"
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-800/50 px-6">
        <div className="flex items-center gap-2">
          <Image
            src="/Potentia_logo_full.svg"
            alt="Potentia"
            width={140}
            height={35}
            className="brightness-0 invert"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <motion.div
          variants={{
            show: {
              transition: {
                staggerChildren: 0.05,
              },
            },
          }}
          initial="hidden"
          animate="show"
        >
          {visibleNavItems.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <motion.div
                key={item.name}
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  show: { opacity: 1, x: 0 },
                }}
                transition={{ duration: 0.2 }}
              >
                {item.section && (
                  <div className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    {item.section}
                  </div>
                )}
                <Link
                  href={item.href}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-white shadow-lg shadow-emerald-500/20'
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 top-0 h-full w-1 rounded-r-full bg-gradient-to-b from-brand-primary to-brand-dark"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}

                  <Icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110',
                      isActive ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'
                    )}
                  />

                  <span className="flex-1">{item.name}</span>

                  {item.badge && (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-1.5 py-0"
                    >
                      {item.badge}
                    </Badge>
                  )}

                  {/* Hover effect */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-500/0 to-teal-500/0 opacity-0 transition-opacity duration-200 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 group-hover:opacity-100" />
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800/50 p-4">
        <div className="rounded-lg bg-gray-800/30 p-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-dark">
              <span className="text-xs font-bold text-white">
                {roleLabels[userRole].slice(0, 1)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-300 truncate">
                {roleLabels[userRole]}
              </div>
              <div className="text-xs text-gray-500">Stage B • v1.0.0</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
