export type TeamType = 'permanent' | 'contract' | 'leadership';

export interface PipelineStage {
  status: string;
  label: string;
  probability: number;
  color: string;
}

export interface PipelineRow {
  id: string; // consultant_id or team node_id
  name: string;
  type: 'team' | 'consultant';
  teamType: TeamType;
  stageCounts: Record<string, number>; // status → count of active submissions

  // Perm metrics (dollar revenue)
  confirmedRevenue: number; // placed perm fee revenue this month
  weightedPipelineRevenue: number; // sum of (avgPermFee × probability) for active stages
  target: number | null;
  gap: number | null; // target - (confirmed + weighted)
  percentToTarget: number | null;

  // Contract metrics (GP/hr margin)
  confirmedGpPerHour: number; // sum of gp_per_hour from placed contract placements
  weightedGpPerHour: number; // sum of (avgGpPerHourRate × probability) for active stages
  gpPerHourTarget: number | null;
  gpPerHourGap: number | null;
  gpPerHourPercentToTarget: number | null;

  // Job counts
  openJobs: number; // job orders assigned with open status
  jobsWithSubmissions: number; // unique jobs with active pipeline submissions
  jobsWithoutSubmissions: number; // openJobs - jobsWithSubmissions

  children?: PipelineRow[]; // consultant rows under a team
}

export interface PipelineAverages {
  avgPermFee: number;
  avgContractGp: number; // total contract GP (gp_per_hour × hours_per_day × working_days)
  avgGpPerHourRate: number; // average raw gp_per_hour from historical placements
  permCount: number;
  contractCount: number;
}

export interface PipelineData {
  rows: PipelineRow[];
  stages: PipelineStage[];
  averages: PipelineAverages;
  monthLabel: string;
}

export interface BulletChartData {
  teamId: string;
  teamName: string;
  confirmed: number;
  forecast: number; // confirmed + weighted pipeline
  target: number;
}

// --- Drill-Down Types ---

export interface PipelineDrillDownRequest {
  consultantIds: string[];
  status: string; // pipeline stage status
  teamType: TeamType;
  title: string;
}

export interface PipelineDrillDownRow {
  id: string;
  statusDate: string;
  jobTitle: string;
  companyName: string;
  candidateName: string;
  stage: string;
  employmentType: string;
  value: number; // fee_amount (perm) or gp_per_hour (contract)
  probability: number;
  weightedValue: number;
  consultantName: string;
}

export interface PipelineDrillDownResult {
  rows: PipelineDrillDownRow[];
  totalRows: number;
}
