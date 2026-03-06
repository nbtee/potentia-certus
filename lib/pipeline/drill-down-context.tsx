'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { PipelineDrillDownRequest } from './types';

interface PipelineDrillDownContextType {
  request: PipelineDrillDownRequest | null;
  openDrillDown: (req: PipelineDrillDownRequest) => void;
  closeDrillDown: () => void;
}

const PipelineDrillDownContext = createContext<PipelineDrillDownContextType | undefined>(undefined);

export function PipelineDrillDownProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<PipelineDrillDownRequest | null>(null);

  const openDrillDown = useCallback((req: PipelineDrillDownRequest) => {
    setRequest(req);
  }, []);

  const closeDrillDown = useCallback(() => {
    setRequest(null);
  }, []);

  return (
    <PipelineDrillDownContext.Provider value={{ request, openDrillDown, closeDrillDown }}>
      {children}
    </PipelineDrillDownContext.Provider>
  );
}

export function usePipelineDrillDown() {
  const context = useContext(PipelineDrillDownContext);
  if (!context) {
    throw new Error('usePipelineDrillDown must be used within PipelineDrillDownProvider');
  }
  return context;
}
