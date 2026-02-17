'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listUsers,
  updateUser,
  deactivateUser,
  reactivateUser,
  inviteUser,
} from '@/app/admin/users/actions';
import {
  listNodes,
  createNode,
  updateNode,
  deleteNode,
} from '@/app/admin/hierarchy/actions';
import {
  listBusinessRules,
  createBusinessRule,
  updateBusinessRule,
  deleteBusinessRule,
} from '@/app/admin/rules/actions';
import {
  listTargets,
  createTarget,
  updateTarget,
  deleteTarget,
  bulkSetTeamTargets,
} from '@/app/admin/targets/actions';
import {
  listDataAssets,
  createDataAsset,
  updateDataAsset,
} from '@/app/admin/data-assets/actions';
import {
  listContextDocuments,
  updateContextDocument,
} from '@/app/admin/context-docs/actions';
import {
  listUnmatchedTerms,
  resolveUnmatchedTerm,
  bulkDismissTerms,
} from '@/app/admin/synonyms/actions';
import {
  getIngestionStatus,
  listIngestionRuns,
} from '@/app/admin/ingestion/actions';
import { listAuditLogs } from '@/app/admin/audit-log/actions';

// =============================================================================
// Query Keys
// =============================================================================

export const adminKeys = {
  users: ['admin', 'users'] as const,
  hierarchy: ['admin', 'hierarchy'] as const,
  rules: ['admin', 'rules'] as const,
  targets: ['admin', 'targets'] as const,
  dataAssets: ['admin', 'data-assets'] as const,
  contextDocs: ['admin', 'context-docs'] as const,
  synonyms: ['admin', 'synonyms'] as const,
  ingestionStatus: ['admin', 'ingestion-status'] as const,
  ingestionRuns: ['admin', 'ingestion-runs'] as const,
  auditLogs: (filters?: Record<string, unknown>) =>
    ['admin', 'audit-logs', filters ?? {}] as const,
  overview: ['admin', 'overview'] as const,
};

// =============================================================================
// Users
// =============================================================================

export function useUsers() {
  return useQuery({
    queryKey: adminKeys.users,
    queryFn: async () => {
      const result = await listUsers();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof inviteUser>[0]) => {
      const result = await inviteUser(input);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof updateUser>[0]) => {
      const result = await updateUser(input);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const result = await deactivateUser(userId);
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users }),
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const result = await reactivateUser(userId);
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users }),
  });
}

// =============================================================================
// Hierarchy
// =============================================================================

export function useHierarchy() {
  return useQuery({
    queryKey: adminKeys.hierarchy,
    queryFn: async () => {
      const result = await listNodes();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useCreateNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof createNode>[0]) => {
      const result = await createNode(input);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.hierarchy }),
  });
}

export function useUpdateNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof updateNode>[0]) => {
      const result = await updateNode(input);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.hierarchy }),
  });
}

export function useDeleteNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nodeId: string) => {
      const result = await deleteNode(nodeId);
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.hierarchy }),
  });
}

// =============================================================================
// Business Rules
// =============================================================================

export function useBusinessRules() {
  return useQuery({
    queryKey: adminKeys.rules,
    queryFn: async () => {
      const result = await listBusinessRules();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useCreateBusinessRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof createBusinessRule>[0]) => {
      const result = await createBusinessRule(input);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.rules }),
  });
}

export function useUpdateBusinessRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof updateBusinessRule>[0]) => {
      const result = await updateBusinessRule(input);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.rules }),
  });
}

export function useDeleteBusinessRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ruleId: string) => {
      const result = await deleteBusinessRule(ruleId);
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.rules }),
  });
}

// =============================================================================
// Targets
// =============================================================================

export function useTargets() {
  return useQuery({
    queryKey: adminKeys.targets,
    queryFn: async () => {
      const result = await listTargets();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useCreateTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof createTarget>[0]) => {
      const result = await createTarget(input);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.targets }),
  });
}

export function useUpdateTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof updateTarget>[0]) => {
      const result = await updateTarget(input);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.targets }),
  });
}

export function useDeleteTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetId: string) => {
      const result = await deleteTarget(targetId);
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.targets }),
  });
}

export function useBulkSetTeamTargets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof bulkSetTeamTargets>[0]) => {
      const result = await bulkSetTeamTargets(input);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.targets }),
  });
}

// =============================================================================
// Data Assets
// =============================================================================

export function useAdminDataAssets() {
  return useQuery({
    queryKey: adminKeys.dataAssets,
    queryFn: async () => {
      const result = await listDataAssets();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useCreateDataAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof createDataAsset>[0]) => {
      const result = await createDataAsset(input);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.dataAssets }),
  });
}

export function useUpdateDataAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof updateDataAsset>[0]) => {
      const result = await updateDataAsset(input);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.dataAssets }),
  });
}

// =============================================================================
// Context Documents
// =============================================================================

export function useContextDocuments() {
  return useQuery({
    queryKey: adminKeys.contextDocs,
    queryFn: async () => {
      const result = await listContextDocuments();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useUpdateContextDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof updateContextDocument>[0]) => {
      const result = await updateContextDocument(input);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.contextDocs }),
  });
}

// =============================================================================
// Synonyms / Unmatched Terms
// =============================================================================

export function useUnmatchedTerms() {
  return useQuery({
    queryKey: adminKeys.synonyms,
    queryFn: async () => {
      const result = await listUnmatchedTerms();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useResolveUnmatchedTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof resolveUnmatchedTerm>[0]) => {
      const result = await resolveUnmatchedTerm(input);
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.synonyms });
      qc.invalidateQueries({ queryKey: adminKeys.dataAssets });
    },
  });
}

export function useBulkDismissTerms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (termIds: string[]) => {
      const result = await bulkDismissTerms(termIds);
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.synonyms }),
  });
}

// =============================================================================
// Ingestion
// =============================================================================

export function useIngestionStatus() {
  return useQuery({
    queryKey: adminKeys.ingestionStatus,
    queryFn: async () => {
      const result = await getIngestionStatus();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    refetchInterval: 30000, // Poll every 30s
  });
}

export function useIngestionRuns() {
  return useQuery({
    queryKey: adminKeys.ingestionRuns,
    queryFn: async () => {
      const result = await listIngestionRuns();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

// =============================================================================
// Audit Logs
// =============================================================================

export function useAuditLogs(filters?: {
  userId?: string;
  action?: string;
  tableName?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: adminKeys.auditLogs(filters),
    queryFn: async () => {
      const result = await listAuditLogs(filters);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}
