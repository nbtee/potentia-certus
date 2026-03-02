'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export interface DrillDownRequest {
  assetKey: string;
  title: string;
}

interface DrillDownContextType {
  request: DrillDownRequest | null;
  openDrillDown: (req: DrillDownRequest) => void;
  closeDrillDown: () => void;
}

const DrillDownContext = createContext<DrillDownContextType | undefined>(undefined);

export function DrillDownProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DrillDownRequest | null>(null);

  const openDrillDown = useCallback((req: DrillDownRequest) => {
    setRequest(req);
  }, []);

  const closeDrillDown = useCallback(() => {
    setRequest(null);
  }, []);

  return (
    <DrillDownContext.Provider value={{ request, openDrillDown, closeDrillDown }}>
      {children}
    </DrillDownContext.Provider>
  );
}

export function useDrillDown() {
  const context = useContext(DrillDownContext);
  if (!context) {
    throw new Error('useDrillDown must be used within DrillDownProvider');
  }
  return context;
}
