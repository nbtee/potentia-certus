/**
 * System Prompt Builder
 *
 * Assembles the AI system prompt from:
 * - Data asset catalog (with synonyms + shapes)
 * - Widget type catalog
 * - Context documents
 * - Business rules
 * - User context (role, team)
 * - Current dashboard widgets
 */

import { WIDGET_REGISTRY } from '@/lib/widgets/widget-registry';
import type { DataAsset } from '@/lib/data-assets/types';
import type { DashboardWidget } from '@/lib/dashboards/types';
import type { AIMode } from './sanitize';

export interface PromptContext {
  dataAssets: DataAsset[];
  contextDocuments: Array<{ doc_key: string; title: string; content: string }>;
  businessRules: Array<{ rule_key: string; description: string; rule_value: unknown }>;
  userRole: string;
  userTeam?: string;
  hierarchyLevel?: string;
  currentWidgets: DashboardWidget[];
  detectedMode: AIMode;
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const sections: string[] = [];

  // Identity
  sections.push(`You are Potentia Certus AI, a recruitment data intelligence assistant.
You help users explore their recruitment data by creating dashboard widgets or answering questions directly.
Always be concise and professional. Never fabricate data — only use the data assets listed below.`);

  // Available Data Assets
  if (ctx.dataAssets.length > 0) {
    const assetLines = ctx.dataAssets
      .filter((a) => a.is_active)
      .map((a) => {
        const parts = [`[${a.asset_key}]: ${a.display_name}`];
        if (a.description) parts.push(`  Description: ${a.description}`);
        if (a.synonyms?.length) parts.push(`  Synonyms: ${a.synonyms.join(', ')}`);
        if (a.output_shapes?.length) parts.push(`  Shapes: ${a.output_shapes.join(', ')}`);
        if (a.available_dimensions?.length) parts.push(`  Dimensions: ${a.available_dimensions.join(', ')}`);
        return parts.join('\n');
      })
      .join('\n\n');

    sections.push(`## Available Data Assets\n${assetLines}`);
  }

  // Available Widget Types
  const widgetLines = Object.entries(WIDGET_REGISTRY)
    .map(([key, entry]) => `- ${key} (${entry.expectedShape}): ${entry.label} — ${entry.description}. Default size: ${entry.defaultSize.w}x${entry.defaultSize.h}`)
    .join('\n');

  sections.push(`## Available Widget Types\n${widgetLines}`);

  // Context Documents
  if (ctx.contextDocuments.length > 0) {
    const docLines = ctx.contextDocuments
      .map((d) => `### ${d.title}\n${d.content}`)
      .join('\n\n');
    sections.push(`## Context Documents\n${docLines}`);
  }

  // Business Rules
  if (ctx.businessRules.length > 0) {
    const ruleLines = ctx.businessRules
      .map((r) => `- ${r.rule_key}: ${r.description}`)
      .join('\n');
    sections.push(`## Active Business Rules\n${ruleLines}`);
  }

  // User Context
  const userParts = [`Role: ${ctx.userRole}`];
  if (ctx.userTeam) userParts.push(`Team: ${ctx.userTeam}`);
  if (ctx.hierarchyLevel) userParts.push(`Hierarchy Level: ${ctx.hierarchyLevel}`);
  sections.push(`## User Context\n${userParts.join(', ')}`);

  // Current Dashboard State
  if (ctx.currentWidgets.length > 0) {
    const widgetLines = ctx.currentWidgets
      .map((w) => {
        const title = w.widget_config?.title || w.widget_type;
        const assetKey = w.data_asset?.asset_key || 'unknown';
        return `- "${title}" (${w.widget_type}, asset: ${assetKey})`;
      })
      .join('\n');
    sections.push(`## Current Dashboard Widgets\nThe dashboard already has these widgets (avoid duplicates):\n${widgetLines}`);
  }

  // Mode Detection Hint
  if (ctx.detectedMode === 'builder') {
    sections.push(`## Mode Hint\nThe user's query appears to be a **Builder** request (create/add widgets). Use the create_widgets tool.`);
  } else if (ctx.detectedMode === 'answer') {
    sections.push(`## Mode Hint\nThe user's query appears to be an **Answer** request (data question). Use the query_data tool.`);
  }

  // Instructions
  sections.push(`## Instructions

### Builder Mode (create_widgets tool)
Use when the user wants to add widgets to their dashboard. Call the create_widgets tool with:
- Map the user's request to data assets from the catalog above
- Choose the best widget type for the data asset's supported shapes
- Provide a clear title and appropriate display config
- Suggest reasonable default layout sizes
- You can suggest multiple widgets for complex requests

### Answer Mode (query_data tool)
Use when the user asks a direct data question. Call the query_data tool with:
- The most relevant data asset key
- Query parameters (filters, dimensions)
- A natural language answer summarizing what the data shows
- Set offer_persist=true if the answer could be useful as a dashboard widget

### General Rules
- Always map queries to existing data assets. If no match exists, list the unmatched terms.
- Match widget types to the asset's supported output shapes.
- If the request is ambiguous, ask the user whether they want a widget or a direct answer.
- Keep widget titles concise (3-6 words).
- Never generate or execute SQL — all data access goes through data assets.`);

  return sections.join('\n\n');
}
