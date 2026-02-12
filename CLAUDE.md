# Potentia Certus

## Project Overview

Recruitment Data Intelligence Platform. Ingests activity data from Bullhorn ATS (via **SQL Server staging mirror**), applies revenue blending logic, and uses AI to build dashboard widgets from natural language queries.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), ShadCN/UI, Tailwind CSS v4, Recharts, Nivo, TanStack Table, Framer Motion, react-grid-layout
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, Realtime, RLS, Vault, pg_cron)
- **AI:** Anthropic Claude via Edge Function proxy, Vercel AI SDK (`useChat()`)
- **Data Source:** SQL Server mirror of Bullhorn (NOT Bullhorn REST API)
- **Hosting:** Vercel (production), `localhost:3001` (development)

## Architecture

Three-library design: **Data Assets** (abstract measures) -> **Shape Contracts** (`single_value`, `categorical`, `time_series`, `funnel_stages`, `matrix`, `tabular`) -> **Widgets** (pure presentation). Widgets know nothing about the data source.

- Dashboards persist in the database. AI builds once, DB serves ongoing (zero AI tokens for rendering).
- Two AI modes: **Builder** (creates persistent widgets) and **Answer** (direct data responses).
- RLS on every table, scoped by org hierarchy via `visible_hierarchy_nodes()`.
- Server-side aggregation only. Client data budget: <50KB per dashboard.
- SQL Server ingestion via `pg_cron`-triggered Edge Function (every 5-15 min). Polling-based status change detection for submittal persistence.

## Development Commands

```bash
# Local development (port 3001 -- port 3000 is occupied)
npm run dev          # runs next dev -p 3001

# Build and type check
npm run build
npm run lint

# Supabase MCP server is available for AI-assisted database work
# Use it for migrations, schema changes, and Edge Function deployment
```

## Code Conventions

- Use TypeScript strict mode throughout
- React Server Components by default; `"use client"` only when needed
- ShadCN/UI for all UI components -- do not introduce alternative component libraries
- Recharts for charts (except heatmap which uses Nivo)
- TanStack Query for all data fetching (`staleTime: 60s`, `refetchOnWindowFocus: true`)
- All database queries go through data asset definitions, never raw SQL from the client
- Edge Functions use Deno (Supabase standard)
- Secrets: Supabase Vault or Edge Function env vars. Never in client code. Never in Git.

## Security Rules

- RLS must be enabled on every new table
- Service role key: Edge Functions only, never client-side
- AI responses are untrusted text -- never use `dangerouslySetInnerHTML`
- Anthropic API key: Edge Function proxy only, never exposed to browser
- All AI-generated queries go through data asset abstraction + RLS (AI cannot run arbitrary SQL)
- Audit sensitive operations to `private.audit_log`

## Key Database Tables

**Core:** `org_hierarchy`, `user_profiles`, `business_rules`, `consultant_targets`, `data_assets`, `submittal_events`, `submission_status_log`, `placements`, `activities`
**Dashboard:** `dashboards`, `dashboard_widgets`
**Admin:** `context_documents`, `unmatched_terms`, `ingestion_runs`
**Security:** `private.audit_log`, `private.ai_rate_limits`, `user_visible_consultants`

## Org Hierarchy

National > Region > Office > Squad/Team > Individual (Consultant)

## Project Structure

```
potentia-certus/
  CLAUDE.md                    # This file (shared, committed to git)
  potentia-certus/
    temp/                      # Architecture documentation
      Technical Briefs - Potentia Certus.md   # 12 briefs (primary architecture reference)
      Setup & Build Guide.md                  # Human steps + 10 build stages (A-J)
      Project Specification - Data Intelligence Application.md  # Original stakeholder spec
      Requirements Queue - Open Questions.md  # Open questions (RQ-001 to RQ-005)
```

## Reference Documents

For detailed architecture decisions, read:
- @potentia-certus/temp/Technical Briefs - Potentia Certus.md
- @potentia-certus/temp/Setup & Build Guide.md
- @potentia-certus/temp/Requirements Queue - Open Questions.md

## Build Stages (Summary)

A: Schema+Seed -> B/C/D in parallel (App Shell, Widgets+Mock, SQL Server Ingestion) -> E: Connect Widgets to Data -> F: Dashboard Persistence -> G: Admin UI (parallel with F) -> H: AI Orchestration -> I: Security Hardening -> J: Performance Tuning

See the Setup & Build Guide for full stage details with test criteria.

## Current Status

**Phase:** Documentation/Architecture complete. No application code yet.

**Inputs still needed from stakeholder:**
- SQL Server connection details + network accessibility
- Real org hierarchy data
- Context document content (4 Markdown docs)
- Revenue blending multiplier values
- Initial user list with roles
