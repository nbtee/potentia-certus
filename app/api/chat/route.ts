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
 */

import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ai/rate-limit';
import { buildSystemPrompt, type PromptContext } from '@/lib/ai/system-prompt';
import { sanitizeInput, detectMode } from '@/lib/ai/sanitize';
import { widgetPairingSchema } from '@/lib/ai/types';
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
    .select('role, display_name, team_id')
    .eq('id', user.id)
    .single();

  // Fetch team name if user has a team
  let userTeam: string | undefined;
  if (profile?.team_id) {
    const { data: teamNode } = await supabase
      .from('org_hierarchy')
      .select('name')
      .eq('id', profile.team_id)
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
    .select('doc_key, title, content')
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
        description: 'Create one or more dashboard widgets based on the user request. Use this for Builder mode when the user wants to visualize data.',
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
        description: 'Query a data asset to answer a direct data question. Use this for Answer mode when the user asks about specific metrics or values.',
        parameters: z.object({
          reasoning: z.string().describe('Brief explanation of how the answer was derived'),
          data_asset: z.string().describe('The asset_key to query'),
          parameters: z.record(z.unknown()).default({}).describe('Query parameters'),
          answer: z.string().describe('Natural language answer to the user question'),
          offer_persist: z.boolean().describe('Whether this answer could be useful as a dashboard widget'),
          unmatched_terms: z.array(z.string()).optional().describe('Terms that could not be mapped to data assets'),
        }),
        execute: async ({ reasoning, data_asset, parameters, answer, offer_persist, unmatched_terms }) => {
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
            mode: 'answer' as const,
            reasoning,
            data_asset,
            parameters,
            answer,
            offer_persist,
            unmatched_terms,
          };
        },
      }),
    },
    maxSteps: 2,
  });

  return result.toDataStreamResponse();
}
