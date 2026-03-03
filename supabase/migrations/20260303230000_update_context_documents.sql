-- ============================================================================
-- Migration: Update Context Documents with Real Potentia Business Knowledge
-- ============================================================================
-- Replaces placeholder content in the 4 context documents with detailed
-- Potentia-specific business knowledge for AI system prompt injection.
-- ============================================================================

-- 1. Business Vernacular & Terminology
UPDATE context_documents SET
  content = '# Business Vernacular & Terminology

## Activity Types (from Bullhorn)
- **BD Call** (Business Development Call): Outbound call to a new or prospective client to generate job orders. Leading indicator.
- **AD Call** (Account Development Call): Call to an existing client to deepen the relationship or uncover new opportunities.
- **AM Call** (Account Management Call): Call to manage an existing client relationship, check on placements, ensure satisfaction.
- **Candidate Call**: Call to a candidate — sourcing, screening, interview prep, offer discussion, or placement follow-up.
- **BD Meeting**: Face-to-face or video meeting with a prospective or existing client for business development.
- **Coffee Catch Up - Client**: Informal meeting with a client contact, often relationship-building.
- **Coffee Catch Up - Candidate**: Informal meeting with a candidate.
- **LMTCB** (Left Message To Call Back): Attempted call where a voicemail or message was left.

## Common Slang
- "BD calls" = BD Call activity type
- "client calls" = AM Call + AD Call + BD Call combined
- "candidate calls" = Candidate Call activity type
- "subs" / "submittals" = candidate submissions to job orders (from submission_status_log table)
- "coffees" = Coffee Catch Up activities (both client and candidate)
- "JOs" = Job Orders
- "deals" = Placements (successful hires)
- "perm" = Permanent placement (one-time fee)
- "contract" = Contract/temporary placement (ongoing GP per hour)
- "GP" = Gross Profit

## Pipeline Stages (submittal lifecycle)
Submitted → Client Review → Interview Scheduled → Interview Complete → Offer Extended → Placed

## Revenue
- **Permanent placement fee**: One-time fee_amount (typically % of annual salary)
- **Contract GP**: Gross profit per hour (gp_per_hour) × hours × duration
- **Blended revenue**: Weighted combination of perm fees and annualized contract GP',
  version = version + 1,
  updated_at = NOW()
WHERE document_type = 'business_vernacular';

-- 2. Leading vs Lagging Indicators
UPDATE context_documents SET
  content = '# Leading vs Lagging Indicators

## Leading Indicators (Activity-Based)
These predict future results. High leading indicator activity today → placements in 4-12 weeks.

| Indicator | Source | Typical Benchmark |
|---|---|---|
| BD Calls | activities (BD Call) | 15-25 per consultant per week |
| BD Meetings | activities (BD Meeting) | 3-5 per consultant per week |
| Candidate Calls | activities (Candidate Call) | 20-40 per consultant per week |
| Client Calls (AM+AD+BD) | activities | 25-40 per consultant per week |
| Coffee Catch-Ups | activities | 2-3 per consultant per week |

## Lagging Indicators (Outcome-Based)
These measure results. They trail activity by 4-12 weeks.

| Indicator | Source | Typical Cycle |
|---|---|---|
| Job Orders Created | job_orders | 1-2 weeks after BD activity |
| Submittals | submission_status_log | 1-3 weeks after JO created |
| Interviews | submission_status_log (Interview Scheduled) | 1-2 weeks after submittal |
| Placements | placements | 2-8 weeks after interview |
| Revenue | placements (fee_amount/gp_per_hour) | On placement start date |

## Pipeline Velocity
- BD Call → Job Order: ~1-2 weeks
- Job Order → First Submittal: ~1 week
- Submittal → Interview: ~1-2 weeks
- Interview → Offer: ~1-2 weeks
- Offer → Placement: ~1 week
- **Total cycle**: 4-8 weeks typical

## Coaching Insight
If lagging indicators (placements, revenue) are down, look at leading indicators from 4-8 weeks ago. If those were also low, the root cause is activity volume. If leading indicators were healthy but placements dropped, investigate conversion rates (submittals → interviews, interviews → offers).',
  version = version + 1,
  updated_at = NOW()
WHERE document_type = 'leading_lagging_indicators';

-- 3. Motivation Framework
UPDATE context_documents SET
  content = '# Motivation Framework

## By Role

### Consultants
- **Primary driver**: Personal billings and placement count
- **Key metrics to highlight**: Their activity vs team average, conversion rates, pipeline depth
- **Coaching angle**: "Your BD calls are 20% above team average — great hustle. Now let''s look at your submittal-to-interview conversion to turn that activity into placements."
- **Watch for**: Low activity + low placements = motivation issue. High activity + low placements = skill/conversion issue.

### Team Leads
- **Primary driver**: Team performance and developing their consultants
- **Key metrics to highlight**: Team aggregate activity, individual consultant breakdowns, team pipeline health
- **Coaching angle**: Compare their team''s metrics to other teams. Highlight their top performer and areas for coaching.
- **Watch for**: Uneven distribution (one star carrying the team) vs balanced team performance.

### Managers
- **Primary driver**: Regional/national performance, strategic growth
- **Key metrics to highlight**: Regional comparisons, year-over-year trends, pipeline forecasts, revenue
- **Coaching angle**: High-level trends, market insights, strategic recommendations.

## Coaching Conversation Starters
- "Your [metric] is [X]% above/below the team average of [Y]."
- "Compared to last month, your [metric] has [increased/decreased] by [X]%."
- "Your pipeline has [X] active submittals — based on typical conversion rates, that suggests [Y] potential placements."
- "Looking at the last quarter, your strongest area is [X] while [Y] could use some attention."

## Key Ratios to Watch
- **BD Calls per Job Order**: How many BD calls to generate one JO (lower is better, ~10-15 typical)
- **Submittals per Placement**: How many subs to make one placement (~5-8 typical)
- **Interview-to-Offer**: Conversion from interview to offer (~30-50% healthy)
- **Activity-to-Placement Ratio**: Total activities per placement (varies by seniority)',
  version = version + 1,
  updated_at = NOW()
WHERE document_type = 'motivation_framework';

-- 4. Metric Relationships
UPDATE context_documents SET
  content = '# Metric Relationships

## Causal Chain
BD Calls → Client Meetings → Job Orders → Submittals → Interviews → Offers → Placements → Revenue

Each step has a conversion rate. Improving conversion at any stage compounds downstream.

## Cross-Metric Analysis Patterns

### "How is [consultant] doing?"
Query in this order:
1. BD Call count (leading indicator of future pipeline)
2. Total client calls (AM+AD+BD) for relationship health
3. Candidate call count (sourcing activity)
4. Submittal count (pipeline building)
5. Placement count (outcomes)
Compare each to team average and previous period.

### "How is [team/region] performing?"
1. Aggregate activity volume (all types)
2. Submittal funnel (conversion rates between stages)
3. Placement count + revenue
4. Compare to other teams/regions

### Revenue Calculation
- **Permanent**: fee_amount (stored on placement record)
- **Contract**: gp_per_hour × 8 hours/day × calendar days between start and end date
  (Note: 8 hrs/day is a default assumption — actual hoursPerDay not yet available in data)
- **Blended revenue**: Sum of permanent fees + annualized contract GP across all placements

## NZ Recruitment Market Seasonality
- **January**: Slow start, summer holidays in NZ, ramp-up mid-month
- **February-March**: Strong activity, clients setting budgets
- **April-June**: Steady, financial year-end for board (March)
- **July-August**: Winter slowdown, budget reviews
- **September-November**: Peak hiring season, pre-Christmas push
- **December**: Winds down mid-month, Christmas/summer break

## Data Source Mapping
- Activities (BD calls, candidate calls, meetings, etc.) → activities table
- Submittals/submissions → submission_status_log table (NOT activities)
- Placements → placements table
- Job orders → job_orders table
- Strategic referrals → strategic_referrals table (auto-generated from activities)',
  version = version + 1,
  updated_at = NOW()
WHERE document_type = 'metric_relationships';
