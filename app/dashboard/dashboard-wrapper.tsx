'use client';

import { FilterProvider } from '@/lib/contexts/filter-context';
import { ReactNode } from 'react';

export function DashboardWrapper({ children }: { children: ReactNode }) {
  return <FilterProvider>{children}</FilterProvider>;
}
