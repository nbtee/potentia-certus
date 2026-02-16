# Widget Library - Implementation Plan
*Created: 2026-02-16*

## 📊 Current Status
**Widgets Built:** 2/11
**Can Build Now:** 8/11 (73%)
**Blocked:** 3/11 (need additional data assets)

---

## ✅ ALREADY BUILT

### 1. KPI Card Widget ✅
**File:** `components/widgets/kpi-card.tsx`
**Shape:** `single_value`
**Use Cases:**
- Activity counts (calls, meetings, emails)
- Placement counts
- Revenue totals
- Target attainment %

**Data Sources:**
- ✅ All 12 activity data assets
- ⚠️ Missing: placement/revenue/pipeline data assets

**Status:** Complete, working with activity data

---

### 2. Time Series Chart Widget ✅
**File:** `components/widgets/time-series-chart.tsx`
**Shape:** `time_series`
**Chart Types:** Line, Area
**Use Cases:**
- Activity trends over time
- Revenue trends
- Placement trends
- Pipeline progression

**Data Sources:**
- ✅ All 12 activity data assets (support time_series)
- ⚠️ Missing: placement/revenue data assets

**Status:** Complete, working with activity data

---

## 🔨 CAN BUILD NOW (With Existing Schema)

### 3. Bar Chart Widget 🟢 **Priority 1**
**File:** `components/widgets/bar-chart.tsx` (NEW)
**Shape:** `categorical`
**Complexity:** Medium (3 hours)

**Use Cases:**
- Activities by consultant (top performers)
- Activities by team/region (comparison)
- Activities by type (breakdown)
- Placements by consultant
- Revenue by team

**Data Sources:**
- ✅ All 12 activity assets support `categorical` shape
- ✅ Can group by: consultant, team, region
- ✅ Sample query: "Show BD calls by consultant this month"

**Schema Requirements:**
```typescript
interface CategoricalData {
  categories: Array<{
    label: string;      // Consultant name, team name, etc.
    value: number;      // Count or sum
    metadata?: object;  // Extra info (e.g., target, last month)
  }>;
  format?: 'number' | 'currency' | 'percentage';
  xAxisLabel?: string;
  yAxisLabel?: string;
}
```

**Implementation:**
- Use Recharts BarChart component
- Support horizontal/vertical orientation
- Support stacked bars (multiple series)
- Color gradient based on value ranges
- Click to drill-through (show detail modal)

**Status:** ✅ **Ready to build** - All data available

---

### 4. Donut/Pie Chart Widget 🟢 **Priority 2**
**File:** `components/widgets/donut-chart.tsx` (NEW)
**Shape:** `categorical`
**Complexity:** Low (2 hours)

**Use Cases:**
- Activity type breakdown (% of total)
- Team contribution to total (% share)
- Perm vs Contract split
- Client vs Candidate activity split

**Data Sources:**
- ✅ All activity assets (categorical shape)
- ✅ Can calculate percentages from counts
- ✅ Sample: "Show my activity breakdown by type"

**Schema Requirements:**
```typescript
interface CategoricalData {
  categories: Array<{
    label: string;     // Activity type, team name
    value: number;     // Will convert to %
    color?: string;    // Optional custom color
  }>;
  total?: number;      // For % calculation
}
```

**Implementation:**
- Use Recharts PieChart/Cell components
- Donut style (center hole with total)
- Animated hover effects
- Legend with percentages
- Click slice to filter dashboard

**Status:** ✅ **Ready to build** - All data available

---

### 5. Data Table Widget 🟢 **Priority 3**
**File:** `components/widgets/data-table.tsx` (NEW)
**Shape:** `tabular` (NEW SHAPE)
**Complexity:** High (4 hours)

**Use Cases:**
- Consultant leaderboard (ranked list)
- Recent activities log
- Placement pipeline (candidate → job → status)
- Team performance comparison

**Data Sources:**
- ✅ Activities table (for activity log)
- ✅ Org hierarchy (for consultant names)
- ⚠️ Need new data assets for:
  - `consultant_leaderboard` (revenue + placements ranked)
  - `recent_activities` (last 50 activities)
  - `placement_pipeline` (active submissions)

**Schema Requirements:**
```typescript
interface TabularData {
  columns: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'currency' | 'date' | 'badge';
    sortable?: boolean;
    width?: number;
  }>;
  rows: Array<{
    id: string;
    [columnKey: string]: any;
  }>;
  totalRows?: number;     // For pagination
  pageSize?: number;
}
```

**Implementation:**
- Use TanStack Table v8
- Sortable columns
- Pagination (client-side for <1000 rows)
- Row click → drill-through modal
- Export to CSV button
- Search/filter bar

**New Shape Contract Needed:**
- Add `tabular` to shape-contracts.ts
- Add `queryTabular()` to data-asset-queries.ts

**Status:** ⚠️ **Partially ready** - Need to:
1. Add `tabular` shape contract ✅ (quick)
2. Add query function ✅ (1 hour)
3. Build widget UI (4 hours)

---

### 6. Target Gauge Widget 🟢 **Priority 4**
**File:** `components/widgets/target-gauge.tsx` (NEW)
**Shape:** `single_value` (with target metadata)
**Complexity:** Medium (3 hours)

**Use Cases:**
- Revenue vs target (circular progress)
- Placements vs target
- Activity goals (calls/meetings quota)

**Data Sources:**
- ✅ `consultant_targets` table exists
- ⚠️ Need new data asset: `target_attainment`
  - Calculates: (actual / target) × 100%
  - Returns: percentage with color (green/amber/red)

**Schema Requirements:**
```typescript
interface SingleValue {
  value: number;       // Actual value (e.g., 85000)
  label: string;
  format?: 'number' | 'currency';
  comparison?: {
    value: number;     // Target value (e.g., 100000)
    label: string;     // "vs Target"
    percentage: number; // 85%
    status: 'on-track' | 'at-risk' | 'off-track';
  };
}
```

**Implementation:**
- Circular progress ring (Recharts RadialBarChart or custom SVG)
- Color changes: Green (≥100%), Amber (80-99%), Red (<80%)
- Center text shows percentage
- Subtitle shows actual vs target ($85K / $100K)
- Animation on mount

**New Data Asset Needed:**
```sql
INSERT INTO data_assets (asset_key, display_name, ...) VALUES
('target_attainment', 'Target Attainment',
 'Actual performance vs target for the period',
 ARRAY['target', 'goal', 'quota', 'performance vs target'],
 'performance',
 ARRAY['single_value'],
 ARRAY['consultant', 'team', 'region'],
 ARRAY['date_range', 'target_type'],
 '{"source_tables": ["placements", "consultant_targets"], "calculation": "actual/target*100"}'::jsonb);
```

**Status:** ⚠️ **Need data asset** (30 min to add) → Then ready to build

---

### 7. Leaderboard Widget 🟢 **Priority 5**
**File:** `components/widgets/leaderboard.tsx` (NEW)
**Shape:** `categorical` or `tabular`
**Complexity:** Medium (2 hours)

**Use Cases:**
- Top consultants by revenue
- Top consultants by placements
- Top teams by activity
- Rankings with badges (🥇🥈🥉)

**Data Sources:**
- ✅ Can use `categorical` shape with consultant dimension
- ✅ Already supports: activity counts by consultant
- ⚠️ Need: placement/revenue data assets

**Schema Requirements:**
```typescript
interface CategoricalData {
  categories: Array<{
    label: string;      // Consultant name
    value: number;      // Metric value
    rank?: number;      // 1, 2, 3...
    avatar?: string;    // Profile image URL
    badge?: 'gold' | 'silver' | 'bronze';
  }>;
}
```

**Implementation:**
- Vertical list with rank numbers
- Top 3 get medal badges
- Avatar + name + metric value
- Animated entrance (stagger)
- Highlight current user's position
- "Show More" to expand beyond top 10

**Status:** ✅ **Ready to build** with activity data
⚠️ Better with placement/revenue data assets

---

### 8. Stacked Bar Chart Widget 🟢 **Priority 6**
**File:** `components/widgets/stacked-bar-chart.tsx` (NEW)
**Shape:** `time_series` (multi-series) or `categorical` (multi-series)
**Complexity:** Medium (3 hours)

**Use Cases:**
- Activity breakdown over time (stacked by type)
- Team performance over time (stacked by team)
- Perm vs Contract revenue over time
- Pipeline stage distribution

**Data Sources:**
- ✅ Activity data with type dimension
- ✅ Time series data
- ✅ Can query multiple data assets and combine

**Schema Requirements:**
```typescript
interface TimeSeries {
  series: Array<{
    name: string;      // Series label (e.g., "BD Calls")
    data: Array<{ date: string; value: number; }>;
    color?: string;    // Stack color
  }>;
  stacked: true;       // Indicates stacking
}
```

**Implementation:**
- Recharts BarChart with multiple Bar components
- Stacked={true} prop
- Legend shows all series
- Tooltip shows breakdown on hover
- Can toggle series on/off in legend

**Status:** ✅ **Ready to build** - All data available

---

## ⚠️ NEED DATA ASSETS FIRST

### 9. Funnel/Conversion Widget 🟡 **Blocked**
**File:** `components/widgets/funnel-chart.tsx` (NEW)
**Shape:** `funnel_stages` (NEW SHAPE)
**Complexity:** Medium (3 hours)

**Use Cases:**
- Submittal → Interview → Offer → Placement
- Conversion rates at each stage
- Drop-off analysis

**Data Sources:**
- ⚠️ **BLOCKED** - Need `submission_status_log` data assets:
  - `submittal_count`
  - `interview_count`
  - `offer_count`
  - `placement_count`
  - `conversion_rate_submittal_to_interview`
  - `conversion_rate_interview_to_offer`
  - `conversion_rate_offer_to_placement`

**Schema Requirements:**
```typescript
interface FunnelStages {
  stages: Array<{
    label: string;        // "Submittals"
    value: number;        // 100
    percentage: number;   // 100%
    conversionRate?: number; // 60% (to next stage)
  }>;
}
```

**What We Need:**
1. Add 7 new data assets (1 hour)
2. Query `submission_status_log` table
3. Calculate conversion rates
4. Build funnel visualization

**Status:** 🔴 **Blocked - Need data assets**
**Effort to unblock:** 1 hour to add assets + 3 hours to build widget

---

### 10. Heatmap Widget 🟡 **Blocked**
**File:** `components/widgets/heatmap.tsx` (NEW)
**Shape:** `matrix` (NEW SHAPE)
**Complexity:** High (4 hours)

**Use Cases:**
- Activity by day of week × hour of day
- Consultant × activity type intensity
- Region × month performance

**Data Sources:**
- ⚠️ **BLOCKED** - Need data assets that return matrix data
- Need to GROUP BY two dimensions simultaneously
- Example: `activity_heatmap_time` (day × hour)

**Schema Requirements:**
```typescript
interface MatrixData {
  rows: string[];      // Y-axis labels ["Mon", "Tue", ...]
  columns: string[];   // X-axis labels ["8am", "9am", ...]
  cells: number[][];   // 2D array of values
  format?: 'number' | 'percentage';
  colorScale?: { min: string; max: string; };
}
```

**What We Need:**
1. Add `matrix` shape contract
2. Add query function for 2D grouping
3. Add heatmap data assets
4. Install Nivo (for heatmap component)
5. Build widget

**Status:** 🔴 **Blocked - Need data assets + shape**
**Effort to unblock:** 2 hours data layer + 4 hours widget

---

### 11. Combination Chart Widget 🟢 **Low Priority**
**File:** `components/widgets/combo-chart.tsx` (NEW)
**Shape:** `time_series` (multi-series with different types)
**Complexity:** Medium (3 hours)

**Use Cases:**
- Revenue (bars) + Placements (line) over time
- Activity count (bars) + Conversion rate (line)
- Dual Y-axes for different scales

**Data Sources:**
- ✅ Can combine two time_series queries
- ✅ All activity data supports this

**Schema Requirements:**
```typescript
interface TimeSeries {
  series: Array<{
    name: string;
    data: Array<{ date: string; value: number; }>;
    chartType: 'bar' | 'line' | 'area';
    yAxisId?: 'left' | 'right';  // For dual axes
  }>;
}
```

**Implementation:**
- Recharts ComposedChart
- Mix Bar, Line, Area components
- Dual Y-axes for different scales
- Synced tooltips

**Status:** ✅ **Ready to build** - Low priority

---

## 📋 BUILD ORDER RECOMMENDATION

### **Phase 1: Core Widgets** (1 day)
Build widgets that work with **existing data assets** (activities):

1. **Bar Chart** (3 hours) - Most versatile, high impact
2. **Donut Chart** (2 hours) - Quick win, visual variety
3. **Leaderboard** (2 hours) - Gamification, engagement

**Deliverable:** 5 widget types total (2 existing + 3 new)

---

### **Phase 2: Advanced UI** (1 day)
Add sophisticated widgets and interactions:

4. **Data Table** (4 hours) - Add `tabular` shape + build widget
5. **Stacked Bar Chart** (3 hours) - Time series breakdown

**Deliverable:** 7 widget types total

---

### **Phase 3: Performance Widgets** (4 hours)
Build widgets that need new data assets:

6. **Add placement/revenue/pipeline data assets** (1 hour)
   - `placement_count`, `placement_revenue_perm`, `placement_revenue_contract`
   - `submittal_count`, `interview_count`, `offer_count`
   - `target_attainment`

7. **Target Gauge** (3 hours) - Needs `target_attainment` asset

**Deliverable:** 8 widget types + core data assets

---

### **Phase 4: Advanced Visualizations** (Optional - 1 day)
Only if needed for specific use cases:

8. **Funnel Chart** (3 hours) - Pipeline visualization
9. **Heatmap** (4 hours) - Time/consultant intensity
10. **Combo Chart** (3 hours) - Mixed visualizations

**Deliverable:** 11 widget types (complete library)

---

## 🎯 RECOMMENDED STARTING POINT

**Start with Phase 1** (1 day, 3 widgets):
- Bar Chart ← **Start here!**
- Donut Chart
- Leaderboard

**Why?**
- ✅ All data available NOW (activity data assets)
- ✅ High visual impact
- ✅ Cover most dashboard use cases
- ✅ Can test with real data immediately
- ✅ No schema changes needed

**After Phase 1 you'll have:**
- 5 widget types (40% of library)
- Enough variety for diverse dashboards
- Can proceed to dashboard persistence (Stage F)

---

## 🚀 READY TO START?

**Option A:** Build Bar Chart widget now (3 hours)
**Option B:** Add all Phase 1 widgets (1 day)
**Option C:** Review specific widget before starting

Which would you prefer?
