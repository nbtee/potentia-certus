# Requirements Queue: Open Questions

Items parked during technical brief discussions. To be revisited with stakeholders.

---

## RQ-001: Dimensions Beyond Org Hierarchy

**Context:** Every data asset shares the standard org hierarchy dimensions (time, consultant, office, team, region). But the spec mentions "Account Coverage" heatmaps across ICPs (Ideal Customer Profiles) -- that's a dimension outside the hierarchy.

**Questions:**
- What other dimensions exist outside the org hierarchy? (Client industry, job type, salary band, contract vs perm, seniority level?)
- How are ICPs defined and where do they live? In Bullhorn? In a separate system?
- Is the ICP list static or does it change?

**Impact:** Shapes the dimensional model and determines how many "non-standard" data assets are needed.

---

## RQ-002: Historical Submittal Backfill

**Context:** No historical submittal data before go-live. Stakeholders are comfortable with this for now.

**Questions (for later):**
- Is there any existing CSV/Excel export of past submittals?
- Does the current Bullhorn instance have any third-party reporting integrations that may have captured historical status changes?
- What is the earliest date from which we would want data if a backfill source is found?

**Impact:** Could extend the data asset library's historical coverage if a source is identified.

---

## RQ-003: Multi-Tenancy Scope

**Questions:**
- Is this platform for a single recruitment agency, or will it serve multiple agencies?
- If single-agency: is there a future plan to offer this as a product to other agencies?

**Impact:** Changes auth model, data isolation (RLS policies), and whether the rules engine needs to be per-tenant.

---

## RQ-004: Access Control & Visibility

**Questions:**
- Should consultants only see their own data?
- Can team leads see their team but not other teams?
- Are leaderboards visible company-wide or scoped by hierarchy level?
- Can managers see individual drill-through data for their reports?

**Impact:** Determines Row Level Security policy design in Supabase and what the AI is allowed to show each user.

---

## RQ-005: Data Retention

**Questions:**
- How long should activity data be retained? Indefinitely?
- Is there a regulatory or compliance requirement (e.g., NZ Privacy Act) for data retention/deletion?

**Impact:** Storage costs, query performance at scale, potential need for archival strategy.
