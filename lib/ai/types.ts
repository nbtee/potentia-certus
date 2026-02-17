/**
 * AI Orchestration Types
 *
 * Zod schemas and TypeScript types for Builder/Answer mode responses,
 * chat messages, and widget pairings.
 */

import { z } from 'zod';

// ============================================================================
// Widget Pairing (Builder mode output)
// ============================================================================

export const widgetPairingSchema = z.object({
  data_asset: z.string().describe('The asset_key from data_assets table'),
  widget_type: z.string().describe('Widget type key from widget registry'),
  parameters: z.record(z.unknown()).default({}).describe('Data query parameters'),
  widget_config: z.object({
    title: z.string(),
    comparison: z.boolean().optional(),
    format: z.string().optional(),
    colorScheme: z.enum(['blue', 'green', 'purple', 'orange']).optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    orientation: z.enum(['vertical', 'horizontal']).optional(),
    chartType: z.enum(['line', 'area', 'donut', 'pie']).optional(),
  }),
  suggested_layout: z.object({
    w: z.number().min(2).max(12),
    h: z.number().min(2).max(8),
  }),
});

export type WidgetPairing = z.infer<typeof widgetPairingSchema>;

// ============================================================================
// Builder Mode Response
// ============================================================================

export const builderResponseSchema = z.object({
  mode: z.literal('builder'),
  reasoning: z.string().describe('Explanation of why these widgets were chosen'),
  suggestion: z.string().describe('User-friendly summary of what will be added'),
  pairings: z.array(widgetPairingSchema).min(1).max(6),
  unmatched_terms: z.array(z.string()).optional(),
});

export type BuilderResponse = z.infer<typeof builderResponseSchema>;

// ============================================================================
// Answer Mode Response
// ============================================================================

export const answerResponseSchema = z.object({
  mode: z.literal('answer'),
  reasoning: z.string().describe('Explanation of how the answer was derived'),
  data_asset: z.string().describe('The asset_key used to answer'),
  parameters: z.record(z.unknown()).default({}).describe('Query parameters used'),
  answer: z.string().describe('Formatted natural language answer'),
  offer_persist: z.boolean().describe('Whether to offer saving as a widget'),
  unmatched_terms: z.array(z.string()).optional(),
});

export type AnswerResponse = z.infer<typeof answerResponseSchema>;

// ============================================================================
// Combined AI Response (discriminated union)
// ============================================================================

export const aiResponseSchema = z.discriminatedUnion('mode', [
  builderResponseSchema,
  answerResponseSchema,
]);

export type AIResponse = z.infer<typeof aiResponseSchema>;

// ============================================================================
// Chat Message Types
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
  /** Structured data attached to assistant messages */
  toolInvocations?: ToolInvocation[];
}

export interface ToolInvocation {
  toolCallId: string;
  toolName: 'create_widgets' | 'query_data';
  args: Record<string, unknown>;
  state: 'call' | 'result';
  result?: BuilderResponse | AnswerResponse;
}

// ============================================================================
// Chat Request Body
// ============================================================================

export interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  dashboardId?: string;
}

// ============================================================================
// Rate Limit Response
// ============================================================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}
