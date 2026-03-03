/**
 * AI Chat API Route
 *
 * POST /api/chat
 *
 * Handles conversational AI for Builder and Answer modes.
 * - Authenticates via Supabase JWT (from cookies)
 * - Checks per-user rate limits
 * - Builds context-aware system prompt
 * - Streams response via Vercel AI SDK + Anthropic
 * - Uses tool calls for structured Builder/Answer output
 *
 * The query_data tool uses the shared queryDataAsset() layer so it
 * correctly queries all 5 source tables (activities, job_orders,
 * submission_status_log, placements, strategic_referrals).
 */

import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ai/rate-limit';
import { buildSystemPrompt, type PromptContext } from '@/lib/ai/system-prompt';
import { sanitizeInput, detectMode } from '@/lib/ai/sanitize';
import { widgetPairingSchema } from '@/lib/ai/types';
import { queryDataAsset } from '@/lib/data/data-asset-queries';
import { resolveScope } from '@/lib/ai/resolve-scope-server';
import { formatShapeResult } from '@/lib/ai/format-results';
import type { DataAsset } from '@/lib/data-assets/types';
import type { DashboardWidget } from '@/lib/dashboards/types';

export const maxDuration = 60;

export async function POST(req: Request) {
  // -----------------------------------------------------------------------
  // 0. Check API key is configured
  // -----------------------------------------------------------------------
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'AI is not configured yet. Please set the ANTHROPIC_API_KEY environment variable.' },
      { status: 503 }
    );
  }

  // -----------------------------------------------------------------------
  // 1. Authenticate
  // -----------------------------------------------------------------------
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // -----------------------------------------------------------------------
  // 2. Rate limit
  // -----------------------------------------------------------------------
  const rateLimit = await checkRateLimit(user.id);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: 'Rate limit exceeded. Please wait a moment before sending another message.' },
      { status: 429 }
    );
  }

  // -----------------------------------------------------------------------
  // 3. Parse request body
  // -----------------------------------------------------------------------
  const body = await req.json();
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = body.messages ?? [];
  const dashboardId: string | undefined = body.dashboardId;

  if (messages.length === 0) {
    return Response.json({ error: 'No messages provided' }, { status: 400 });
  }

  // Sanitize the latest user message
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role === 'user') {
    lastMessage.content = sanitizeInput(lastMessage.content);
  }

  if (!lastMessage.content) {
    return Response.json({ error: 'Empty message' }, { status: 400 });
  }

  // -----------------------------------------------------------------------
  // 4. Build system prompt context
  // -----------------------------------------------------------------------
  const detectedMode = detectMode(lastMessage.content);

  // Fetch user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, display_name, hierarchy_node_id')
    .eq('id', user.id)
    .single();

  // Fetch team name if user has a hierarchy node
  let userTeam: string | undefined;
  if (profile?.hierarchy_node_id) {
    const { data: teamNode } = await supabase
      .from('org_hierarchy')
      .select('name')
      .eq('id', profile.hierarchy_node_id)
      .single();
    userTeam = teamNode?.name ?? undefined;
  }

  // Fetch data assets
  const { data: dataAssets } = await supabase
    .from('data_assets')
    .select('*')
    .eq('is_active', true)
    .order('category');

  // Fetch context documents
  const { data: contextDocs } = await supabase
    .from('context_documents')
    .select('document_type, title, content')
    .eq('is_active', true);

  // Fetch business rules
  const { data: businessRules } = await supabase
    .from('business_rules')
    .select('rule_key, description, rule_value')
    .eq('is_active', true);

  // Fetch current dashboard widgets if dashboardId provided
  let currentWidgets: DashboardWidget[] = [];
  if (dashboardId) {
    const { data: widgets } = await supabase
      .from('dashboard_widgets')
      .select('*, data_assets:data_asset_id (asset_key, display_name, output_shapes, category)')
      .eq('dashboard_id', dashboardId);

    if (widgets) {
      currentWidgets = widgets.map((w: Record<string, unknown>) => ({
        ...w,
        data_asset: w.data_assets,
      })) as DashboardWidget[];
    }
  }

  const promptContext: PromptContext = {
    dataAssets: (dataAssets as DataAsset[]) || [],
    contextDocuments: contextDocs || [],
    businessRules: businessRules || [],
    userRole: profile?.role || 'consultant',
    userName: profile?.display_name || undefined,
    userTeam,
    currentWidgets,
    detectedMode,
  };

  const systemPrompt = buildSystemPrompt(promptContext);

  // -----------------------------------------------------------------------
  // 5. Stream AI response with tool definitions
  // -----------------------------------------------------------------------
  const result = streamText({
    model: anthropic('claude-sonnet-4-5-20250929'),
    system: systemPrompt,
    messages,
    tools: {
      create_widgets: tool({
        description: 'Create one or more dashboard widgets based on the user request. Only use this when the user explicitly asks to add a widget, chart, or visualization to their dashboard.',
        parameters: z.object({
          reasoning: z.string().describe('Brief explanation of why these widgets were chosen'),
          suggestion: z.string().describe('User-friendly summary of what will be added to the dashboard'),
          pairings: z.array(widgetPairingSchema).min(1).max(6).describe('Widget specifications'),
          unmatched_terms: z.array(z.string()).optional().describe('Terms that could not be mapped to data assets'),
        }),
        execute: async ({ reasoning, suggestion, pairings, unmatched_terms }) => {
          // Log unmatched terms
          if (unmatched_terms?.length) {
            for (const term of unmatched_terms) {
              await supabase.rpc('log_unmatched_term', {
                p_user_query: lastMessage.content,
                p_unmatched_term: term,
              });
            }
          }

          return {
            mode: 'builder' as const,
            reasoning,
            suggestion,
            pairings,
            unmatched_terms,
          };
        },
      }),
      query_data: tool({
        description:
          'Query a data asset to answer a data question. Use this for Answer mode. ' +
          'You can call this tool multiple times in sequence for multi-metric answers ' +
          '(e.g. "How is Sarah doing?" needs activity count + submittals + placements). ' +
          'Choose the appropriate shape: single_value for counts/totals, categorical for ' +
          'breakdowns by consultant, time_series for trends over time, funnel_stages for ' +
          'pipeline conversion.',
        parameters: z.object({
          asset_key: z.string().describe('The asset_key from data_assets catalog'),
          shape: z.enum(['single_value', 'categorical', 'time_series', 'funnel_stages']).describe(
            'Output shape: single_value for a count/total, categorical for leaderboard/breakdown, ' +
            'time_series for trend over time, funnel_stages for pipeline conversion'
          ),
          date_range: z.object({
            start: z.string().describe('Start date YYYY-MM-DD'),
            end: z.string().describe('End date YYYY-MM-DD'),
          }).optional().describe('Date range filter. Omit for all-time.'),
          scope: z.string().nullable().optional().describe(
            'Scope filter: consultant name (e.g. "Sarah"), team name (e.g. "Auckland Perm"), ' +
            'region (e.g. "Auckland"), island (e.g. "North Island"), or null for national'
          ),
          limit: z.number().optional().describe('Max results for categorical shape (default 10)'),
        }),
        execute: async ({ asset_key, shape, date_range, scope, limit }) => {
          try {
            // Resolve scope to consultant IDs
            const scopeResult = await resolveScope(scope, supabase);

            // Build query params matching DataAssetParams interface
            const queryResult = await queryDataAsset(
              {
                assetKey: asset_key,
                shape,
                filters: {
                  dateRange: date_range,
                  consultantIds: scopeResult.consultantIds,
                },
                limit: limit || 10,
              },
              supabase
            );

            // Format results as readable text for the AI
            const formatted = formatShapeResult(
              queryResult.data,
              asset_key,
              scopeResult.label,
              date_range
            );

            return {
              mode: 'answer' as const,
              asset_key,
              shape,
              scope: scopeResult.label,
              date_range: date_range || null,
              formatted_result: formatted,
              query_time_ms: queryResult.metadata.queryTime,
              record_count: queryResult.metadata.recordCount,
            };
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Query failed';
            return {
              mode: 'answer' as const,
              asset_key,
              shape,
              scope: scope || 'National',
              date_range: date_range || null,
              formatted_result: `Error querying ${asset_key}: ${message}`,
              query_time_ms: 0,
              record_count: 0,
            };
          }
        },
      }),
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
