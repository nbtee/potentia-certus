import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FilterProvider } from '@/lib/contexts/filter-context';
import { PipelineContent } from './pipeline-content';
import { Loader2 } from 'lucide-react';

function PipelineFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );
}

/**
 * Resolve scope from URL search params on the server.
 * This avoids depending on client-side hierarchy hooks which can hang.
 */
async function resolveServerScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  userHierarchyNodeId: string | null,
  searchParams: Record<string, string | string[] | undefined>
): Promise<string[] | null> {
  const scope = (searchParams.scope as string) ?? 'self';
  const nodesParam = searchParams.nodes as string | undefined;

  if (scope === 'national') return null;

  if (scope === 'self') return [userId];

  if (scope === 'custom-users' && nodesParam) {
    const ids = nodesParam.split(',').filter(Boolean);
    return ids.length > 0 ? ids : [userId];
  }

  if (scope === 'custom' && nodesParam) {
    const selectedNodeIds = nodesParam.split(',').filter(Boolean);
    if (selectedNodeIds.length === 0) return [userId];

    // Fetch hierarchy tree to expand nodes
    const { data: tree } = await supabase
      .from('org_hierarchy')
      .select('id, parent_id, hierarchy_level, name');

    if (!tree) return [userId];

    // Expand region nodes to team nodes
    const teamNodeIds = new Set<string>();
    for (const nodeId of selectedNodeIds) {
      const node = tree.find((n) => n.id === nodeId);
      if (!node) continue;
      if (node.hierarchy_level === 'team') {
        teamNodeIds.add(node.id);
      } else if (node.hierarchy_level === 'region') {
        tree
          .filter((n) => n.parent_id === node.id && n.hierarchy_level === 'team')
          .forEach((n) => teamNodeIds.add(n.id));
      } else if (node.hierarchy_level === 'national') {
        return null; // national = no filter
      }
    }

    if (teamNodeIds.size === 0) return [userId];

    // Resolve team nodes to consultant UUIDs
    const { data: consultants } = await supabase
      .from('user_profiles')
      .select('id, hierarchy_node_id')
      .not('hierarchy_node_id', 'is', null);

    if (!consultants) return [userId];

    const ids = consultants
      .filter((c) => c.hierarchy_node_id && teamNodeIds.has(c.hierarchy_node_id))
      .map((c) => c.id);

    return ids.length > 0 ? ids : [userId];
  }

  if (scope === 'my-team' && userHierarchyNodeId) {
    const { data: consultants } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('hierarchy_node_id', userHierarchyNodeId);

    return consultants?.map((c) => c.id) ?? [userId];
  }

  return [userId];
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('hierarchy_node_id')
    .eq('id', user.id)
    .single();

  const userHierarchyNodeId = profile?.hierarchy_node_id ?? null;
  const params = await searchParams;
  const initialConsultantIds = await resolveServerScope(
    supabase, user.id, userHierarchyNodeId, params
  );

  return (
    <Suspense fallback={<PipelineFallback />}>
      <FilterProvider
        userId={user.id}
        userHierarchyNodeId={userHierarchyNodeId}
      >
        <PipelineContent initialConsultantIds={initialConsultantIds} />
      </FilterProvider>
    </Suspense>
  );
}
