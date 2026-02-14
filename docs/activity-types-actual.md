# Actual Activity Types from Bullhorn

**Extracted:** 2026-02-14
**Source:** PAPJobs TargetJobsDB.Notes table
**Total Activities:** 36,263
**Distinct Types:** 42

---

## 📊 Top 20 Activity Types by Volume

| # | Activity Type | Count | % of Total | Consultants | Category |
|---|--------------|-------|------------|-------------|----------|
| 1 | **Candidate Connect/Follow Up** | 12,656 | 35% | 31 | 👤 Candidate |
| 2 | **LMTCB** | 5,884 | 16% | 28 | 📞 Call |
| 3 | **Candidate Screening Call** | 3,865 | 11% | 29 | 👤 Candidate |
| 4 | **AM Call** | 2,649 | 7% | 24 | 🎯 Client |
| 5 | **Consultant Interview** | 1,617 | 4% | 27 | 👤 Candidate |
| 6 | **AD Call** | 1,302 | 4% | 18 | 🎯 Client |
| 7 | **Coffee Catch Up - Client** | 1,275 | 4% | 23 | 🎯 Client |
| 8 | **Headhunt Call** | 959 | 3% | 10 | 👤 Candidate |
| 9 | **Email Connect** | 691 | 2% | 25 | 📧 Email |
| 10 | **Coffee Catch Up - Candidate** | 632 | 2% | 28 | 👤 Candidate |
| 11 | **BD Call** | 594 | 2% | 22 | 🎯 Client |
| 12 | **Interview Feedback** | 460 | 1% | 18 | 👤 Candidate |
| 13 | **BD Meeting** | 447 | 1% | 19 | 🎯 Client |
| 14 | **LI/Seek Update** | 343 | 1% | 13 | 📧 Email |
| 15 | **TXT Connect** | 337 | 1% | 26 | 📱 SMS |
| 16 | **Submittal** | 320 | 1% | 5 | 📋 Pipeline |
| 17 | **Strategic Referral** | 304 | 1% | 20 | 🎯 Client |
| 18 | **Consultant Rejected** | 300 | 1% | 17 | 👤 Candidate |
| 19 | **Post Placement Check In** | 292 | 1% | 22 | ✅ Follow-up |
| 20 | **Reference Check Call** | 243 | 1% | 15 | 👤 Candidate |

**Top 20 = 35,169 activities (97% of total)**

---

## 🎯 Proposed Data Assets (High Priority)

Based on volume and business value, I recommend tracking these activity types:

### Tier 1: Core Sales Activities (Must Have)

| Data Asset Key | Display Name | Activity Types | Annual Volume | Why Track |
|----------------|--------------|----------------|---------------|-----------|
| `bd_call_count` | BD Calls | "BD Call" | 594 | Leading indicator of new business |
| `ad_call_count` | AD Calls | "AD Call", "AM Call" | 3,951 | Client relationship management |
| `bd_meeting_count` | BD Meetings | "BD Meeting" | 447 | High-value prospecting |
| `client_meeting_count` | Client Meetings | "Coffee Catch Up - Client" | 1,275 | Client face-time |

### Tier 2: Candidate Engagement (Must Have)

| Data Asset Key | Display Name | Activity Types | Annual Volume | Why Track |
|----------------|--------------|----------------|---------------|-----------|
| `candidate_call_count` | Candidate Calls | "Candidate Connect/Follow Up", "LMTCB", "Candidate Screening Call", "Headhunt Call" | 23,364 | 64% of all activity - core work |
| `candidate_meeting_count` | Candidate Meetings | "Coffee Catch Up - Candidate", "Consultant Interview" | 2,249 | In-depth candidate engagement |

### Tier 3: Pipeline Activities (Should Have)

| Data Asset Key | Display Name | Activity Types | Annual Volume | Why Track |
|----------------|--------------|----------------|---------------|-----------|
| `interview_feedback_count` | Interview Feedback | "Interview Feedback" | 460 | Process quality tracking |
| `reference_check_count` | Reference Checks | "Reference Check Call" | 243 | Pre-placement activity |
| `post_placement_checkin_count` | Post-Placement Check-ins | "Post Placement Check In" | 292 | Retention/satisfaction |

### Tier 4: Digital Outreach (Nice to Have)

| Data Asset Key | Display Name | Activity Types | Annual Volume | Why Track |
|----------------|--------------|----------------|---------------|-----------|
| `email_outreach_count` | Email Outreach | "Email Connect", "LI/Seek Update" | 1,034 | Digital engagement |
| `linkedin_inmail_count` | LinkedIn InMails | "LinkedIn InMail" | 186 | Social recruiting |
| `sms_outreach_count` | SMS Outreach | "TXT Connect" | 337 | Mobile engagement |

### Tier 5: Aggregate Metrics (For Analysis)

| Data Asset Key | Display Name | Calculation | Why Track |
|----------------|--------------|-------------|-----------|
| `total_activity_count` | Total Activity | SUM(all activities) | Overall productivity |
| `client_touch_count` | Client Touches | BD + AD + Client Meetings | Total client engagement |
| `candidate_touch_count` | Candidate Touches | All candidate activities | Total candidate engagement |
| `outreach_call_count` | All Calls | All call-type activities | Phone productivity |
| `outreach_meeting_count` | All Meetings | All meeting-type activities | Face-to-face productivity |

---

## 🚨 Important Notes

### Activity Types We're NOT Tracking (and why)

These are **outcome statuses** rather than activities - they're already captured in `submission_status_log`:

- ❌ Submittal (320) - Tracked in submission_status_log
- ❌ Client Interview 1/2/Final (58) - Tracked in submission_status_log
- ❌ Offer Extended (12) - Tracked in submission_status_log
- ❌ Placed (10) - Tracked in placements table
- ❌ Longlisted/Shortlisted (116) - Tracked in submission_status_log
- ❌ All rejection types (623) - Tracked in submission_status_log

**Why skip these?** These are pipeline stage changes, not consultant activities. They're already captured in your submission/placement tracking.

### Activity Type Clarifications

**Q: What is "AM Call"?**
- Likely "Account Management Call" (similar to AD Call)
- 2,649 occurrences (7% of activity)
- Recommendation: Group with "AD Call" as they're both account management

**Q: What is "LMTCB"?**
- "Left Message To Call Back"
- 5,884 occurrences (16% of activity!)
- Recommendation: Include in `candidate_call_count` as it's outbound candidate engagement

---

## ✅ Recommended Implementation

### Phase 1: Start with Core Sales & Candidate Activities (8 assets)

```sql
-- Tier 1: Client Activities (4 assets)
1. bd_call_count - "BD Call"
2. ad_call_count - "AD Call", "AM Call"
3. bd_meeting_count - "BD Meeting"
4. client_meeting_count - "Coffee Catch Up - Client"

-- Tier 2: Candidate Activities (4 assets)
5. candidate_call_count - "Candidate Connect/Follow Up", "LMTCB", "Candidate Screening Call", "Headhunt Call"
6. candidate_meeting_count - "Coffee Catch Up - Candidate", "Consultant Interview"
7. interview_feedback_count - "Interview Feedback"
8. reference_check_count - "Reference Check Call"
```

**This covers 33,882 activities (93% of total volume)**

### Phase 2: Add Digital & Aggregates (7 more assets)

```sql
9. email_outreach_count
10. linkedin_inmail_count
11. sms_outreach_count
12. total_activity_count
13. client_touch_count
14. candidate_touch_count
15. post_placement_checkin_count
```

---

## 📋 Your Decision Needed

**Option A: Start Small (Phase 1 only - 8 assets)**
- Covers 93% of activity volume
- Focus on core sales metrics
- Can expand later

**Option B: Comprehensive (All 15 assets)**
- Complete coverage
- Includes digital and aggregates
- More complex to maintain

**Option C: Custom**
- You pick which assets from the tiers above

**Which option do you prefer?**

- [ ] Option A - Phase 1 only (8 core assets)
- [ ] Option B - All 15 assets
- [ ] Option C - Let me customize

---

## 🎯 Example Queries (once implemented)

**Individual:**
- "How many BD calls did I make this month?"
- "Show my candidate call activity vs last quarter"
- "What's my client meeting count this week?"

**Team:**
- "Compare AD calls across all regions"
- "Which consultant had the most candidate touches?"
- "Show me Auckland's BD activity over time"

**Conversion Analysis:**
- "BD calls to job orders conversion"
- "Candidate calls to submittal rate"
- "Interview feedback to placement correlation"

---

## Next Step

Once you choose an option, I'll:
1. Create migration to add the selected data assets
2. Define exact activity type mappings
3. Apply to Supabase
4. You can start querying: "Show me my BD calls this month" 🚀
