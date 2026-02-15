# Potentia Certus

Recruitment Data Intelligence Platform with AI-powered dashboard builder.

## Project Status

**Stage B: Application Shell - COMPLETE** ✅
- ✅ Full sidebar navigation with role-based access
- ✅ Global filter bar (date range + hierarchy scope)
- ✅ User authentication and profile management
- ✅ Breadcrumb navigation
- ✅ Responsive dashboard layout

## Tech Stack

- **Frontend**: Next.js 15 (App Router), ShadCN/UI, Tailwind CSS v4, Recharts
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, RLS, Vault)
- **State**: TanStack Query, React Server Components
- **AI**: Anthropic Claude via Edge Function proxy, Vercel AI SDK
- **Data Source**: SQL Server mirror of Bullhorn ATS

## Architecture

Three-library design:
**Data Assets** (abstract measures) → **Shape Contracts** (6 types) → **Widgets** (pure presentation)

**Key Principles:**
- Dashboards persist in database (AI builds once, DB serves ongoing)
- Server-side aggregation only (client data budget <50KB per dashboard)
- Row Level Security on all tables
- No widgets know about data source

## Getting Started

### Prerequisites

- Node.js 20+
- npm (or pnpm)
- Supabase account with project configured
- Supabase CLI (optional, for migrations)

### Installation

```bash
# Install dependencies
npm install

# Start development server (port 3001)
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

### Build

```bash
# Production build
npm run build

# Type checking
npm run lint
```

### Database Operations

```bash
# Push migrations to linked project
supabase db push --linked

# View migration status
supabase migration list --linked

# Inspect database tables
supabase inspect db table-stats --linked
```

## Authentication

### Sign Up

1. Navigate to `/signup`
2. Enter email and password
3. User profile automatically created with **consultant** role (via database trigger)
4. Redirected to login

### Sign In

1. Navigate to `/login`
2. Enter credentials
3. Redirected to `/dashboard` based on role

### User Roles

| Role | Access |
|------|--------|
| **consultant** (default) | Dashboard, My Performance |
| **team_lead** | + Team View |
| **manager** | + Analytics, Reports, Regional scope |
| **admin** | Full system access + Data Assets, Settings |

### Database Trigger

User profiles are automatically created when users sign up:

```sql
-- Migration: 20260216000000_add_user_profile_trigger.sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## Project Structure

```
potentia-certus/
├── app/                          # Next.js 15 App Router
│   ├── dashboard/               # Main dashboard (role-based layout)
│   ├── login/, signup/          # Authentication pages
│   ├── api/auth/               # Auth API routes
│   └── providers.tsx            # React Query provider
├── components/                   # React components
│   ├── ui/                      # ShadCN UI primitives
│   ├── app-sidebar.tsx          # Role-based navigation sidebar
│   ├── app-header.tsx           # Header with breadcrumbs + user menu
│   ├── global-filter-bar.tsx    # Date range + hierarchy filters
│   └── breadcrumb.tsx           # Dynamic breadcrumb navigation
├── lib/
│   ├── supabase/                # Supabase clients (server, client, middleware)
│   ├── data-assets/             # Data asset layer (types, hooks, queries)
│   └── utils.ts                 # Shared utilities
├── supabase/
│   ├── config.toml              # Supabase project config
│   └── migrations/              # Database migrations (4 files)
├── types/                        # TypeScript definitions
│   └── database.types.ts        # Generated Supabase types
└── CLAUDE.md                     # Project instructions for AI
```

## Database Schema

**19 tables** across `public` and `private` schemas:

### Core Tables
- `org_hierarchy` - 3-level hierarchy (National → Region → Team → Individual)
- `user_profiles` - Extended user data linked to Supabase Auth
- `data_assets` - 30 measure definitions for AI query mapping
- `business_rules` - Revenue blending multipliers, thresholds

### Data Tables (awaiting SQL Server sync)
- `candidates`, `job_orders`, `client_corporations`
- `submission_status_log` - Append-only status transitions
- `placements` - Revenue data (perm fees, contract GP/hour)
- `activities` - Calls, meetings, notes
- `strategic_referrals` - Extracted from activities

### Dashboard Tables
- `dashboards` - Dashboard definitions with react-grid-layout positions
- `dashboard_widgets` - Widget specifications

### Admin Tables
- `context_documents` - 4 markdown docs for AI system prompt
- `unmatched_terms` - AI synonym feedback loop
- `ingestion_runs` - Sync health tracking

### Security (private schema)
- `private.audit_log` - Security audit trail
- `private.ai_rate_limits` - Rate limiting (10 req/min per user)

**All tables have RLS enabled** (simplified for development, full RBAC in Stage I).

## Navigation & Features

### Sidebar Navigation (Role-Based)

- **All users**: Dashboard, My Performance
- **Team Lead+**: Team View
- **Manager+**: Analytics, Reports
- **Admin only**: Data Assets, Settings

### Global Filter Bar

- **Date Range**: Last 7/30/90 days, Quarter, Year, Custom range
- **Hierarchy Scope** (role-dependent):
  - Consultant: My Performance
  - Team Lead: + My Team
  - Manager: + Region
  - Admin: + National

### Breadcrumb Navigation

Auto-generated from route pathname with clickable segments.

## Environment Variables

Required variables (see `.env.example`):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Edge Functions only

# Development
PORT=3001
```

**⚠️ Security Note**: Service role key should only be used in Edge Functions, never client-side.

## Build Stages

| Stage | Status | Description |
|-------|--------|-------------|
| **A** | ✅ Complete | Schema + Seed Data |
| **B** | ✅ Complete | Application Shell + Auth |
| **C** | 📋 Next | Widget Library + Mock Data |
| **D** | ⏸️ Blocked | SQL Server Ingestion (needs credentials) |
| **E** | 📋 Pending | Connect Widgets to Real Data |
| **F** | 📋 Pending | Dashboard Persistence (save/load) |
| **G** | 📋 Pending | Admin UI (parallel with F) |
| **H** | 📋 Pending | AI Orchestration (Builder/Answer modes) |
| **I** | 📋 Pending | Security Hardening (full RBAC) |
| **J** | 📋 Pending | Performance Tuning |

## Documentation

Comprehensive architecture documentation in `/potentia-certus/temp/`:

- **Technical Briefs - Potentia Certus.md** (2,123 lines, 12 briefs)
  - Phase 0-5 architecture
  - Three-library design principle
  - Security, performance, AI integration
- **Setup & Build Guide.md** (465 lines)
  - 8 human setup steps
  - 10 build stages (A-J) with test criteria
- **Project Specification.md** (139 lines)
  - Original stakeholder requirements
- **Requirements Queue.md** (61 lines)
  - 5 open questions (RQ-001 to RQ-005)

## Development Server

**Default port**: 3001 (port 3000 is occupied)

```bash
npm run dev
```

Visit [http://localhost:3001](http://localhost:3001)

## Critical Pre-Production Requirement

**⚠️ BEFORE PRODUCTION LAUNCH:**

Current database security is simplified for rapid development:
- All authenticated users can see all data
- Anon key approach with basic RLS
- Suitable for development/testing ONLY

**Required before production:**
- Switch to proper role-based access control (RBAC)
- Implement granular RLS policies based on org_hierarchy and user roles
- Change database access methodology (not anon key approach)
- Full security audit

**Stage I (Security Hardening) will address this.**

## License

Proprietary - Potentia Recruitment

## Support

For questions or issues, see `/help` in the app or refer to `CLAUDE.md` for development guidelines.
