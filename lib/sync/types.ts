export interface SyncResult {
  table: string;
  processed: number;
  inserted: number;
  errors: number;
  duration_ms: number;
}

export interface LookupMaps {
  consultants: Map<number, string>;    // bullhorn_corporate_user_id → uuid
  consultantsByNativeId: Map<number, string>; // bullhorn_native_id (IdInDataSrc) → uuid
  candidates: Map<number, string>;     // bullhorn_id → uuid
  jobOrders: Map<number, string>;      // bullhorn_id → uuid
  clientCorporations: Map<number, string>; // bullhorn_id → uuid
}
