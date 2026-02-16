# Testing Checklist - Dashboard Features
*Created: 2026-02-16*

Use this checklist to verify all features are working correctly.

---

## 🔐 **1. Authentication & Navigation**

### Login Flow
- [ ] Visit http://localhost:3001
- [ ] Should redirect to `/login`
- [ ] Enter valid credentials
- [ ] Should redirect to `/dashboard` after successful login
- [ ] Check that user name/email appears in header

### Navigation
- [ ] Sidebar is visible and collapsible
- [ ] Dashboard link is active/highlighted
- [ ] User profile dropdown works in header
- [ ] Logout button redirects to login page

**Expected Result:** ✅ Clean navigation, no errors, smooth redirects

---

## 🎛️ **2. Global Filters**

### Date Range Filter
**Test 1: Preset Ranges**
- [ ] Click "Time Period" dropdown
- [ ] Dropdown has **solid white background** (no transparency)
- [ ] Select "Last 7 days"
- [ ] Click "Apply Filters"
- [ ] "Filters Applied" green badge appears
- [ ] All widgets update (watch loading states)
- [ ] KPI values change
- [ ] Charts show 7-day data range

**Test 2: Different Presets**
- [ ] Try "Last 90 days" → Apply → All widgets update
- [ ] Try "This Quarter" → Apply → All widgets update
- [ ] Try "This Year" → Apply → All widgets update

**Test 3: Custom Date Range**
- [ ] Select "Custom Range" from dropdown
- [ ] Date picker popover appears
- [ ] Select start date (e.g., 1 month ago)
- [ ] Select end date (e.g., today)
- [ ] Click "Apply Filters"
- [ ] Widgets update to show selected range

**Test 4: Clear Filters**
- [ ] Click "Clear" button
- [ ] Resets to "Last 30 days"
- [ ] "Filters Applied" badge disappears
- [ ] Widgets update back to default

**Test 5: URL State**
- [ ] Apply a filter (e.g., Last 7 days)
- [ ] Check URL contains `?dateStart=...&dateEnd=...`
- [ ] Copy URL
- [ ] Open in new tab
- [ ] Should load with same filters applied

**Expected Result:** ✅ Filters work smoothly, all widgets respond, URL state persists

---

## 📊 **3. KPI Cards (Top Section)**

### Display & Data
- [ ] 6 KPI cards are visible
- [ ] Each card shows:
  - [ ] Icon (phone, users, etc.)
  - [ ] Metric value (formatted number)
  - [ ] Metric label/title
  - [ ] Comparison badge (e.g., "+15.2% vs previous 30 days")
  - [ ] Arrow icon (up ↑ / down ↓ / neutral →)

### Specific Cards to Check
1. **Candidate Calls**
   - [ ] Shows count (e.g., "287")
   - [ ] Blue color scheme
   - [ ] Period comparison appears

2. **Candidate Meetings**
   - [ ] Shows count
   - [ ] Green color scheme

3. **BD Calls**
   - [ ] Shows count
   - [ ] Purple color scheme

4. **AD/AM Calls**
   - [ ] Shows count
   - [ ] Blue color scheme

5. **Client Meetings**
   - [ ] Shows count
   - [ ] Orange color scheme

6. **Reference Checks**
   - [ ] Shows count
   - [ ] Green color scheme

### Interactions
- [ ] Hover over cards → subtle lift animation (y: -4px)
- [ ] Cards have gradient backgrounds
- [ ] Loading states show skeleton placeholders

**Expected Result:** ✅ All KPIs display data, comparisons accurate, animations smooth

---

## 📈 **4. Time Series Charts**

### Chart Display
**4 Charts Total:**

1. **Candidate Call Activity**
   - [ ] Area chart (filled)
   - [ ] Blue color (#3b82f6)
   - [ ] Shows daily trend
   - [ ] X-axis: Dates (e.g., "Feb 10", "Feb 11")
   - [ ] Y-axis: Call count

2. **Business Development Calls**
   - [ ] Area chart
   - [ ] Purple color (#8b5cf6)

3. **Candidate Meetings**
   - [ ] Line chart
   - [ ] Green color (#10b981)

4. **Client Meetings & Catch-ups**
   - [ ] Line chart
   - [ ] Orange color (#f59e0b)

### Interactions
- [ ] Hover over data points → tooltip appears
- [ ] Tooltip shows:
  - [ ] Date label
  - [ ] Exact value
  - [ ] Formatted nicely
- [ ] Charts animate on load
- [ ] Grid lines visible
- [ ] Responsive (resize window)

**Expected Result:** ✅ Charts render smoothly, tooltips work, data is accurate

---

## 📊 **5. Bar Charts (Bottom Section)**

### Chart Display
**2 Bar Charts:**

1. **Top Performers: Candidate Calls**
   - [ ] Vertical bars
   - [ ] Blue color gradient (darker at top)
   - [ ] Shows up to 8 consultants
   - [ ] **X-axis shows consultant NAMES** (not UUIDs!)
   - [ ] Y-axis shows call count
   - [ ] Names at 45° angle

2. **Top Performers: BD Calls**
   - [ ] Purple color gradient
   - [ ] Shows up to 8 consultants
   - [ ] Names visible

### Footer Statistics
Each chart should show:
- [ ] **Total:** Sum of all values
- [ ] **Average:** Mean value
- [ ] Both formatted nicely

### Interactions
- [ ] Hover over bars → subtle highlight/cursor change
- [ ] Tooltip appears on hover
- [ ] Shows consultant name + exact count
- [ ] Bars animate on load (smooth entrance)

**Expected Result:** ✅ Consultant names visible, rankings correct, footer stats accurate

---

## 🔄 **6. Filter Integration**

### Test Complete Flow
1. **Baseline:**
   - [ ] Note current values (e.g., Candidate Calls: 287)

2. **Change Date Range:**
   - [ ] Select "Last 7 days" → Apply
   - [ ] **All 6 KPI cards** update
   - [ ] **All 4 time series charts** update (shorter time range)
   - [ ] **All 2 bar charts** update (different rankings)

3. **Expand Date Range:**
   - [ ] Select "Last 90 days" → Apply
   - [ ] KPIs show larger numbers
   - [ ] Charts show longer time series
   - [ ] Bar charts may show more consultants

4. **Verify Consistency:**
   - [ ] KPI "Candidate Calls" matches chart data
   - [ ] Bar chart totals make sense with KPIs
   - [ ] No duplicate data
   - [ ] No missing data points

**Expected Result:** ✅ All widgets update together, data is consistent

---

## ⚡ **7. Performance & UX**

### Loading States
- [ ] Initial page load shows skeletons (not empty)
- [ ] Filter changes show brief loading indicators
- [ ] No layout shift (content doesn't jump)
- [ ] Smooth transitions

### Animations
- [ ] Page entrance: stagger effect (top to bottom)
- [ ] Filter bar: slides in from top
- [ ] Cards: lift on hover
- [ ] Charts: animate on load
- [ ] All animations smooth (60fps)

### Error Handling
**Test Error States:**
1. **Disconnect Internet:**
   - [ ] Widgets show error state (not blank)
   - [ ] Clear error message appears
   - [ ] Red alert icon visible

2. **Invalid Date Range:**
   - [ ] Try setting end date before start date
   - [ ] Should be prevented by UI
   - [ ] No console errors

### Response Time
- [ ] Dashboard loads in < 2 seconds
- [ ] Filter changes apply in < 1 second
- [ ] Charts render in < 500ms
- [ ] No laggy animations

**Expected Result:** ✅ Fast, smooth, no errors

---

## 🎨 **8. UI Polish**

### Visual Check
- [ ] **Filter bar:**
  - [ ] Glassmorphism effect (blur + transparency)
  - [ ] Gradient overlay
  - [ ] Shadows
  - [ ] Dropdowns have **solid white background**

- [ ] **KPI Cards:**
  - [ ] Gradient backgrounds
  - [ ] Proper spacing
  - [ ] Icons aligned
  - [ ] Comparison badges clear

- [ ] **Charts:**
  - [ ] Titles clear
  - [ ] Axes labeled
  - [ ] Grid subtle
  - [ ] Colors consistent

### Responsive Design
- [ ] Desktop (wide): 2-column chart layout
- [ ] Tablet (medium): 1-column chart layout
- [ ] Mobile (narrow): Stacked layout
- [ ] No horizontal scroll
- [ ] Text remains readable

### Typography
- [ ] Headers clear and readable
- [ ] Body text comfortable size
- [ ] Numbers formatted (commas for thousands)
- [ ] No truncation/overflow

**Expected Result:** ✅ Professional, polished, responsive

---

## 🐛 **9. Known Issues & Limitations**

### Current Limitations (Expected)
- [ ] **Single User Data:** All activities attributed to one user
  - **Why:** Seed data uses existing auth user
  - **Impact:** Bar charts may show only one name
  - **When Fixed:** When SQL Server credentials received

- [ ] **Seed Data Only:** Not real Bullhorn data
  - **Why:** Waiting on SQL Server access
  - **Impact:** Data is randomized
  - **When Fixed:** After SQL Server integration

- [ ] **No Hierarchy Scope Filtering (Yet):**
  - Scope selector exists but doesn't filter data
  - **Why:** Needs RLS implementation
  - **Impact:** Shows all data regardless of scope
  - **When Fixed:** After hierarchy scope implementation

### Should NOT See These Issues
- ❌ White screen / blank page
- ❌ Console errors
- ❌ Infinite loading
- ❌ Layout breaking
- ❌ Transparent dropdown backgrounds
- ❌ UUID strings instead of names
- ❌ Missing data when seed exists

**Expected Result:** ✅ Known limitations only, no unexpected bugs

---

## ✅ **10. Final Acceptance Criteria**

### Must Pass All:
- [ ] Can log in and access dashboard
- [ ] All widgets display data (no "No data" messages)
- [ ] Date range filters work and update all widgets
- [ ] Bar charts show consultant names (not UUIDs)
- [ ] Dropdown backgrounds are solid white
- [ ] Period-over-period comparisons appear
- [ ] Charts are interactive (hover tooltips work)
- [ ] Page is responsive (mobile/tablet/desktop)
- [ ] No console errors in browser DevTools
- [ ] Animations are smooth

### Nice to Have (Already Built):
- [ ] URL state persistence (copy link works)
- [ ] Loading skeletons (no layout shift)
- [ ] Error states (graceful failures)
- [ ] Hover effects (cards lift, chart highlights)

---

## 🚀 **Summary**

**Total Test Items:** ~100+ checks
**Estimated Test Time:** 15-20 minutes
**Critical Issues:** Should be ZERO

### After Testing:
1. ✅ If everything passes → Ready to build more widgets
2. ⚠️ If issues found → Document and fix before continuing
3. 📋 Create issue list for any problems discovered

---

## 📝 **Issue Template (If Needed)**

```
### Issue: [Brief Description]
- **Severity:** Critical / High / Medium / Low
- **Component:** KPI Card / Chart / Filter / etc.
- **Steps to Reproduce:**
  1. ...
  2. ...
- **Expected:** ...
- **Actual:** ...
- **Screenshot/Error:** [attach if available]
```

---

**Ready to test?** Start from Section 1 and work through each checklist! 🧪
