'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { PipelineDrillDownRequest, ConsultantJobsDrillDownRequest } from './types';

interface PipelineDrillDownContextType {
  request: PipelineDrillDownRequest | null;
  jobsRequest: ConsultantJobsDrillDownRequest | null;
  openDrillDown: (req: PipelineDrillDownRequest) => void;
  openJobsDrillDown: (req: ConsultantJobsDrillDownRequest) => void;
  closeDrillDown: () => void;
}

const PipelineDrillDownContext = createContext<PipelineDrillDownContextType | undefined>(undefined);

export function PipelineDrillDownProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<PipelineDrillDownRequest | null>(null);
  const [jobsRequest, setJobsRequest] = useState<ConsultantJobsDrillDownRequest | null>(null);

  const openDrillDown = useCallback((req: PipelineDrillDownRequest) => {
    setJobsRequest(null);
    setRequest(req);
  }, []);

  const openJobsDrillDown = useCallback((req: ConsultantJobsDrillDownRequest) => {
    setRequest(null);
    setJobsRequest(req);
  }, []);

  const closeDrillDown = useCallback(() => {
    setRequest(null);
    setJobsRequest(null);
  }, []);

  return (
    <PipelineDrillDownContext.Provider value={{ request, jobsRequest, openDrillDown, openJobsDrillDown, closeDrillDown }}>
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
