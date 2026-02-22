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
          answer: z.string().describe('A template answer to the user question. The system will replace this with real queried data, so use a brief placeholder like "See results below."'),
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

          // Actually query the data asset to get real values
          let resolvedAnswer = answer;
          try {
            const { data: asset } = await supabase
              .from('data_assets')
              .select('display_name, metadata')
              .eq('asset_key', data_asset)
              .single();

            if (asset) {
              const activityTypes = (asset.metadata as Record<string, unknown>)?.activity_types as string[] | undefined;

              // Query activities with consultant names for a full breakdown
              let query = supabase
                .from('activities')
                .select('consultant_id, user_profiles(display_name, first_name, last_name)');

              if (activityTypes?.length) {
                query = query.in('activity_type', activityTypes);
              }

              // Apply date range from parameters if provided
              const dateRange = parameters?.dateRange as { start?: string; end?: string } | undefined;
              if (dateRange?.start) {
                query = query.gte('activity_date', dateRange.start);
              }
              if (dateRange?.end) {
                query = query.lte('activity_date', dateRange.end);
              }

              const { data: rows } = await query;

              if (rows && rows.length > 0) {
                // Group by consultant
                const grouped = new Map<string, { count: number; name: string }>();
                for (const row of rows) {
                  const id = row.consultant_id;
                  if (!id) continue;
                  const p = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
                  const name =
                    (p as Record<string, string> | null)?.display_name ||
                    ((p as Record<string, string> | null)?.first_name && (p as Record<string, string> | null)?.last_name
                      ? `${(p as Record<string, string>).first_name} ${(p as Record<string, string>).last_name}`
                      : 'Unknown');
                  const existing = grouped.get(id) || { count: 0, name };
                  grouped.set(id, { count: existing.count + 1, name });
                }

                const sorted = Array.from(grouped.values()).sort((a, b) => b.count - a.count);
                const total = rows.length;

                // Build formatted answer with real data
                const topN = sorted.slice(0, 10);
                const lines = topN.map(
                  (entry, i) => `${i + 1}. ${entry.name}: ${entry.count.toLocaleString()}`
                );

                resolvedAnswer = `${asset.display_name} — ${total.toLocaleString()} total\n\nTop performers:\n${lines.join('\n')}`;

                if (sorted.length > 10) {
                  resolvedAnswer += `\n\n...and ${sorted.length - 10} more consultants`;
                }
              } else {
                resolvedAnswer = `${asset.display_name} — 0 activities found for the specified period.`;
              }
            }
          } catch {
            // If the query fails, fall back to the AI's original answer
          }

          return {
            mode: 'answer' as const,
            reasoning,
            data_asset,
            parameters,
            answer: resolvedAnswer,
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
