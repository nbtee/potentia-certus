'use client';

import { FilterProvider } from '@/lib/contexts/filter-context';
import { ReactNode } from 'react';

interface DashboardWrapperProps {
  children: ReactNode;
  userId: string;
  userHierarchyNodeId: string | null;
}

export function DashboardWrapper({
  children,
  userId,
  userHierarchyNodeId,
}: DashboardWrapperProps) {
  return (
    <FilterProvider userId={userId} userHierarchyNodeId={userHierarchyNodeId}>
      {children}
    </FilterProvider>
  );
}
