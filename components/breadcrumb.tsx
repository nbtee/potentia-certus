'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

export function Breadcrumb() {
  const pathname = usePathname();

  // Generate breadcrumb items from pathname
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);

    const breadcrumbs = [
      { label: 'Home', href: '/dashboard' },
    ];

    let currentPath = '';
    paths.forEach((path, index) => {
      currentPath += `/${path}`;

      // Convert path segment to readable label
      const label = path
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      breadcrumbs.push({
        label,
        href: currentPath,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();
  const isHomePage = pathname === '/dashboard' || pathname === '/';

  if (isHomePage) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Home className="h-4 w-4 text-gray-500" />
        <span className="font-medium text-gray-900">Dashboard</span>
      </div>
    );
  }

  return (
    <nav className="flex items-center gap-2 text-sm">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <Fragment key={item.href}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            {index === 0 ? (
              <Link
                href={item.href}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <Home className="h-4 w-4" />
              </Link>
            ) : isLast ? (
              <span className="font-medium text-gray-900">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="text-gray-500 hover:text-gray-900 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
