'use client';

import { FilterProvider } from '@/lib/contexts/filter-context';
import { DrillDownProvider } from '@/lib/contexts/drill-down-context';
import { DrillDownSheet } from '@/components/drill-down/drill-down-sheet';
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
      <DrillDownProvider>
        {children}
        <DrillDownSheet />
      </DrillDownProvider>
    </FilterProvider>
  );
}
