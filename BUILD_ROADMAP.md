# Potentia Certus - Complete Build Roadmap
*Updated: 2026-02-16*

## 🎯 Project Goal
**Full-featured recruitment data intelligence platform** with AI-powered dashboards showing real-time insights from Bullhorn data.

---

## 📊 Overall Progress: 45%

```
█████████████████░░░░░░░░░░░░░░░░░░░░░░░ 45%

Completed: 4.5 / 10 stages
Timeline: ~10-15 days to MVP | ~20-25 days to full platform
```

---

## ✅ COMPLETED STAGES

### Stage A: Schema + Seed Data (100% ✅)
**Duration:** 2 days | **Status:** Production-ready

**What we built:**
- ✅ 18 database tables in Supabase
- ✅ RLS policies on all tables
- ✅ Org hierarchy (4 regions, 8 teams)
- ✅ 12 data assets defined (activity tracking)
- ✅ Business rules seeded
- ✅ User profile auto-creation trigger
- ✅ Seed data loaded (50 consultants, 5,000+ activities)

**What's working:**
- Can query database from frontend
- RLS enforces authentication
- Data assets queryable via API
- Revenue calculations ready

**Technical debt:**
- ⚠️ Need to run Supabase Security Advisor (30 min)
- ⚠️ Need full cross-role RLS testing (2 hrs)

---

### Stage B: App Shell + Auth (100% ✅)
**Duration:** 1 day | **Status:** Production-ready

**What we built:**
- ✅ Supabase Auth integration (login/logout)
- ✅ Protected routes with middleware
- ✅ Role-based sidebar navigation
- ✅ Enhanced header with notifications
- ✅ Global filter bar UI (not wired yet)
- ✅ Dashboard layout with gradient backgrounds
- ✅ Breadcrumb navigation
- ✅ User profile dropdown
- ✅ Design tokens system
- ✅ Framer Motion animations throughout

**What's working:**
- Users can log in with email/password
- Session management automatic
- Navigation works smoothly
- Beautiful, animated UI

**Technical debt:**
- 🔴 Global filters not connected to data (HIGH - 2-3 hrs)

---

### Stage E: Connect Widgets to Real Data (90% ✅)
**Duration:** 1 day | **Status:** Working with seed data

**What we built:**
- ✅ Shape contract TypeScript interfaces (6 types)
- ✅ Data asset query functions (all CRUD operations)
- ✅ `useWidgetData` hook with TanStack Query
- ✅ KPI Card widget (animated, with comparisons)
- ✅ Time Series Chart widget (line + area)
- ✅ Dashboard with 6 KPIs + 4 charts
- ✅ Period-over-period comparison logic
- ✅ 60-second caching
- ✅ Automatic query deduplication

**What's working:**
- Dashboard shows real data from seed
- KPIs update automatically
- Charts render activity trends
- Performance is excellent (<50KB per load)

**Technical debt:**
- 🔴 Global filters not wired to widgets (HIGH - 2-3 hrs)
- 🟡 Only using seed data (blocked by SQL Server)
- 🟡 Missing 9 widget types (MEDIUM - 1-2 days)

---

### Stage B.5: Enhanced UI (100% ✅)
**Duration:** 0.5 days | **Status:** Production-ready

**What we built:**
- ✅ Tailwind CSS v4 properly configured
- ✅ PostCSS pipeline working
- ✅ Glass morphism effects
- ✅ Backdrop blur on headers
- ✅ Gradient backgrounds
- ✅ Stagger animations
- ✅ Hover effects and transitions
- ✅ Badge components
- ✅ Card components
- ✅ Skeleton loaders

**What's working:**
- UI looks "world-class" ✨
- Smooth 60fps animations
- Professional polish throughout

---

## 🚧 IN PROGRESS / PARTIAL

### Stage C: Widget Library (40% 🟡)
**Estimated:** 1-2 days | **Status:** Need to complete

**What we have:**
- ✅ KPI Card (complete)
- ✅ Time Series Chart (line + area)
- ✅ Basic grid layout

**What we're missing:**
- ❌ Bar Chart widget (categorical data)
- ❌ Stacked Bar Chart widget
- ❌ Donut/Pie Chart widget
- ❌ Data Table widget (TanStack Table + drill-through)
- ❌ Animated Leaderboard widget
- ❌ Target Gauge widget (circular progress)
- ❌ Heatmap widget (Nivo)
- ❌ Funnel/Conversion widget
- ❌ Widget showcase page (`/dev/widgets`)
- ❌ Drill-through pattern (Sheet overlay)
- ❌ react-grid-layout integration (drag/drop/resize)

**Why we need this:**
- Can't build diverse dashboards without widget variety
- Dashboard persistence (Stage F) requires drag/drop
- Drill-through pattern is core UX requirement

**Recommendation:**
- Build 4-6 core widgets next (1-2 days)
- Bar Chart, Table, Donut, Gauge minimum
- Then proceed to Stage F

---

### Stage D: SQL Server Ingestion (30% 🔴 BLOCKED)
**Estimated:** 2-3 days | **Status:** Waiting on credentials

**What we have:**
- ✅ Database schema ready to receive data
- ✅ Data assets defined
- ✅ Table mappings documented
- ✅ Activity types analyzed (42 types, 36K records)
- ✅ `mssql` package installed

**What we're missing:**
- 🔴 SQL Server connection details (BLOCKER)
- ❌ Edge Function for sync
- ❌ pg_cron scheduling
- ❌ Submittal status detection logic
- ❌ Reconciliation job
- ❌ Error handling and logging
- ❌ Ingestion health dashboard

**Blocking:**
- Waiting on Azure developer for:
  - Server hostname
  - Port (probably 1433)
  - Username/password for `potentia_readonly` user
  - Firewall rules configured

**Timeline once unblocked:**
- Day 1: Build Edge Function, test connection
- Day 2: Implement sync logic, test with 100 records
- Day 3: Schedule pg_cron, monitoring, full sync

---

## ❌ NOT STARTED

### Stage F: Dashboard Persistence (0%)
**Estimated:** 3-4 days | **Dependencies:** Stages C+E complete

**What we need to build:**
- Dashboard list page (`/dashboards`)
- Dashboard view/edit page (`/dashboards/[id]`)
- Dashboard builder UI
- "Add widget" dialog
- react-grid-layout integration (drag/drop/resize)
- Save/load functionality
- Dashboard sharing (toggle + RLS)
- Pipeline layout template
- Server-side rendering optimization

**Test criteria:**
- Create dashboard with 8 widgets
- Drag/resize/reposition widgets
- Save and refresh - persists correctly
- Share with another user - they see their data
- Load pipeline template - 13 widgets render

**Why this matters:**
- This is the "wow moment" - user-created dashboards
- Required before AI can build dashboards (Stage H)

---

### Stage G: Admin UI (0%)
**Estimated:** 3-4 days | **Dependencies:** Stage F (can run in parallel)

**What we need to build:**
- **User Management** (`/admin/users`)
  - User list with search/filter
  - Invite via email (Supabase Auth invites)
  - Edit role and hierarchy assignment
  - Deactivate users
  - Bulk CSV import

- **Org Hierarchy Editor** (`/admin/hierarchy`)
  - Visual tree display
  - Add/remove/move nodes
  - SQL Server department mapping
  - Auto-rebuild `user_visible_consultants`

- **Business Rules** (`/admin/rules`)
  - Revenue blending multipliers
  - Metric definitions and synonyms
  - Targets configuration
  - Effective date management

- **Data Asset Browser** (`/admin/data-assets`)
  - View all data assets
  - Edit synonyms and descriptions
  - Create new assets
  - Usage statistics

- **Context Document Editor** (`/admin/context-docs`)
  - Markdown editor with preview
  - Token count display
  - Version history
  - Test query button

- **Unmatched Synonym Review** (`/admin/synonyms`)
  - List of AI-generated unmatched terms
  - Quick-assign to data assets
  - Dismiss irrelevant terms

- **Ingestion Health** (`/admin/ingestion`)
  - Sync status and schedule
  - Record counts per table
  - Error log with details
  - Manual trigger button

- **Audit Log** (`/admin/audit-log`)
  - Event stream with filters
  - User/action/resource/date filters
  - CSV export

**Test criteria:**
- Invite new user → they receive email → sign up → correct role
- Move consultant to new team → data scope updates immediately
- Change revenue multiplier → blended performance recalculates
- Edit context doc → AI uses updated content
- Add synonym → AI matches new term
- View ingestion health → shows last sync time and errors

**Why this matters:**
- System must be manageable without developer
- Required for AI context (context docs + synonyms)

---

### Stage H: AI Orchestration (0%)
**Estimated:** 3-4 days | **Dependencies:** Stages F+G

**What we need to build:**
- **LLM Proxy Edge Function**
  - Anthropic API integration (Claude 3.5 Sonnet)
  - Rate limiting (per user + global)
  - Input sanitization
  - Structured output (Zod validation)

- **Chat Interface**
  - Slide-out panel from any page
  - Vercel AI SDK `useChat()` hook
  - Lazy-loaded for performance
  - Message history persistence

- **Builder Mode**
  - AI analyzes user query
  - Proposes data asset + widget pairings
  - User approves/rejects
  - Widget persists to current dashboard

- **Answer Mode**
  - AI constructs query via data assets
  - Returns natural language response
  - Shows data inline (no widget)
  - Follow-up question support

- **Mode Detection**
  - Automatic inference from query
  - Fallback prompt for clarification

- **Context System**
  - Load context documents into system prompt
  - Synonym matching with fuzzy search
  - Log unmatched terms to database
  - Duplicate dashboard check

**Test criteria:**
- "Show me Auckland submittals this quarter" → AI proposes KPI + chart → approved → widgets persist
- "How many submittals does Sarah have?" → AI returns direct answer
- Prompt injection attempt → RLS blocks unauthorized data
- Ask about unknown metric → AI proposes new data asset
- Rate limit test → 15 requests in 1 min, last 5 rejected
- Unmatched terms logged and visible in admin UI

**Why this matters:**
- This is the core differentiator
- Natural language → dashboards is the product vision

---

### Stage I: Security Hardening (0%)
**Estimated:** 1 day | **Dependencies:** Stage H

**What we need to verify:**
- Supabase Security Advisor: zero warnings
- Cross-role testing matrix (Brief 10)
- Prompt injection test suite (20+ adversarial prompts)
- Service role key not in client bundle
- `.env.local` in `.gitignore`
- All Edge Functions validate JWT
- Audit log captures sensitive operations
- Candidate anonymization (NZ Privacy Act)
- Admin routes return 403 for non-admins
- Shared dashboards show viewer's scope

**Test criteria:**
- Security Advisor report: clean
- All role combinations tested: ✅
- Prompt injection tests: all blocked
- `grep -r "service_role" .next/`: no results
- Direct admin URL as consultant: 403

**Why this matters:**
- Required for production deployment
- Compliance with NZ Privacy Act
- Prevents data leakage

---

### Stage J: Performance Tuning (0%)
**Estimated:** 1 day | **Dependencies:** Stage I

**What we need to optimize:**
- Dashboard load time profiling (target: <500ms)
- Query `EXPLAIN ANALYZE` on top 5 queries
- Add indexes where needed
- Materialized view refresh (CONCURRENTLY)
- Bundle size audit (target: <250KB gzip)
- Concurrent user simulation (50 users)
- Drill-through pagination (target: <200ms)
- Admin code lazy-loaded (not in main bundle)

**Test criteria:**
- Lighthouse Performance: >90
- Bundle analysis: within targets
- Load testing: acceptable latency
- No crashes with 20+ widgets per dashboard

**Why this matters:**
- User experience depends on speed
- Production readiness requirement

---

## 🎯 CRITICAL PATH TO MVP

**MVP Definition:** Users can view real Bullhorn data in saved dashboards

### Timeline: 10-12 days (assuming SQL Server access obtained immediately)

```
Day 1-2:   Complete widget library (4-6 core widgets)
Day 1-2:   Wire global filters (parallel with widgets)
Day 3:     SQL Server credentials obtained
Day 4-5:   Build ingestion Edge Function + test
Day 6:     Initial full sync of SQL Server data
Day 7-9:   Dashboard persistence (save/load/share)
Day 10:    Integration testing
Day 11:    Bug fixes and polish
Day 12:    MVP launch 🚀
```

### What blocks MVP:
1. 🔴 SQL Server credentials (critical blocker)
2. 🟡 Widget library completion (in progress)
3. 🟡 Global filters wiring (in progress)

---

## 🚀 CRITICAL PATH TO FULL PLATFORM

**Full Platform = MVP + AI + Admin**

### Timeline: 20-25 days from today

```
Days 1-12:  MVP (above)
Days 13-16: Admin UI (user mgmt, hierarchy, rules)
Days 17-20: AI orchestration (Builder + Answer modes)
Day 21:     Security hardening
Day 22:     Performance tuning
Days 23-24: UAT with real users
Day 25:     Production launch 🎉
```

---

## 💡 WHAT WE CAN DO RIGHT NOW (While Waiting for SQL Server)

### High Priority (Start Today)

**1. Wire Global Filters (2-3 hours) 🔴**
- Create filter context provider
- Connect date range to widget queries
- Implement hierarchy scope filtering
- Store state in URL params
- Test with different filters

**Impact:** Makes dashboard actually interactive. Required for MVP.

**2. Build Core Widget Library (1-2 days) 🟡**
- Bar Chart (categorical data) - 3 hrs
- Data Table with drill-through - 4 hrs
- Donut Chart (percentages) - 2 hrs
- Target Gauge (circular progress) - 3 hrs
- Widget showcase page - 2 hrs

**Impact:** Enables diverse dashboards. Required for Stage F.

**3. Implement react-grid-layout (4 hours) 🟡**
- Install package
- Create GridLayout component
- Draggable/resizable widgets
- Save layout to state
- Responsive breakpoints

**Impact:** Core UX for dashboard builder. Required for Stage F.

### Medium Priority (This Week)

**4. Build Dashboard Persistence UI (2-3 days)**
- Dashboard list page
- Dashboard view/edit page
- Add widget dialog
- Save/load functionality
- Share toggle

**Impact:** The "wow moment" for users. Unblocks AI stage.

**5. Start Admin UI Infrastructure (1-2 days)**
- Create `/admin` route structure
- Build user management page
- Hierarchy editor skeleton
- Business rules editor

**Impact:** Required before AI. Can work in parallel with dashboard persistence.

### Low Priority (Next Week)

**6. Prepare Edge Function (1 day)**
- Write SQL Server sync logic (can't test yet)
- Set up error handling
- Create ingestion health tracking
- Document sync strategy

**Impact:** Ready to deploy the moment credentials arrive.

**7. Security Testing (4 hours)**
- Run Supabase Security Advisor
- Cross-role RLS testing
- Document security matrix
- Fix any issues found

**Impact:** Early security verification prevents issues later.

---

## 📋 RECOMMENDED WORK PLAN (Next 3 Days)

### Today (Day 1): Make Dashboard Interactive
**Goal:** Wire filters and add 2 more widget types

1. **Morning:** Wire global filters (2-3 hrs)
   - Create FilterContext
   - Connect to widget queries
   - Test with date ranges

2. **Afternoon:** Build Bar Chart widget (3 hrs)
   - Create component
   - Wire to categorical data
   - Test with activities by consultant

3. **End of day:** Build Data Table widget (2 hrs)
   - TanStack Table setup
   - Pagination
   - Basic styling

**Deliverable:** Dashboard with working filters + 8 total widgets

---

### Tomorrow (Day 2): Dashboard Persistence Foundation
**Goal:** Build the core dashboard builder

1. **Morning:** react-grid-layout integration (4 hrs)
   - Install and configure
   - Draggable widgets
   - Save layout

2. **Afternoon:** Dashboard list page (3 hrs)
   - CRUD operations
   - Dashboard cards
   - Create new dashboard flow

**Deliverable:** Can create, save, and reload custom dashboards

---

### Day 3: Admin UI + Waiting for SQL Server
**Goal:** Start admin interface while waiting

1. **Morning:** User management page (4 hrs)
   - User list
   - Invite flow
   - Role assignment

2. **Afternoon:** Ingestion health page (3 hrs)
   - Status display
   - Error log
   - Manual trigger button

**Deliverable:** Admin UI foundation + ready for SQL Server sync

---

## 🎨 ALTERNATIVE: Focus on Demo-Ready Features

If you want to **demo the platform sooner** (without real SQL Server data):

### Week 1: Make It Beautiful
1. Complete widget library (all 11 types)
2. Dashboard persistence with drag/drop
3. Widget showcase page
4. Polish animations and transitions
5. **Result:** Can demo platform with seed data

### Week 2: Add Intelligence
6. Build AI chat interface
7. Implement Builder mode
8. Create context documents
9. Test with natural language queries
10. **Result:** Can demo AI capabilities

### Week 3: Connect Real Data
11. Get SQL Server credentials
12. Build ingestion pipeline
13. Sync real data
14. **Result:** Production-ready

---

## ❓ QUESTIONS FOR YOU

To help prioritize, I need to know:

1. **Timeline pressure?**
   - Do you have a demo deadline?
   - When do users need access?

2. **SQL Server timeline?**
   - How long until your developer responds?
   - Can we proceed without it for now?

3. **Feature priority?**
   - Most important: AI? Dashboards? Real data?
   - What's the "must have" for first demo?

4. **User testing?**
   - Do you have users ready to test?
   - Internal team or external clients?

---

## 🎯 MY RECOMMENDATION

**Start with Option 1: Wire Filters + Build Widgets (Today & Tomorrow)**

**Why:**
1. ✅ Not blocked by SQL Server
2. ✅ Makes dashboard actually useful
3. ✅ Required for everything else
4. ✅ 2 days of productive work
5. ✅ Visible progress

**Then:**
- Day 3: Dashboard persistence
- Days 4-5: Admin UI basics
- Day 6+: Either AI (if still no SQL Server) or ingestion (if we have credentials)

This approach:
- Keeps momentum going
- Doesn't waste time waiting
- Delivers visible value daily
- Positions us to move fast once SQL Server is ready

**Shall we start with wiring the global filters and building out the widget library?** That's 2 solid days of work that unblocks everything else.
