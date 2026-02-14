# Activity Type Mapping for Data Assets

**Created:** 2026-02-14
**Status:** 🟡 Pending Review

---

## Activity Types from Your Input

Based on your description, here are the activity types you mentioned:

### Client/BD Activities
1. **Business Development Call** (or "VD Call")
2. **AD Call**
3. **Client Meeting**
4. **Coffee Catch-up - Client**

### Candidate Activities
5. **Candidate Connect Call**
6. **Candidate Follow-up**
7. **Coffee Catch-up - Candidate**

---

## Proposed Data Assets to Create

Based on these activities, I propose creating the following data assets:

### 📞 Call Activities

| Data Asset Key | Display Name | Activity Types Included | Synonyms |
|----------------|--------------|------------------------|----------|
| `bd_call_count` | BD Calls | "Business Development Call", "VD Call" | BD calls, business development, new business calls, prospecting calls |
| `ad_call_count` | AD Calls | "AD Call" | AD calls, account development, account management calls, client calls |
| `candidate_call_count` | Candidate Calls | "Candidate Connect Call", "Candidate Follow-up" | candidate calls, candidate connects, candidate follow-ups |

### 🤝 Meeting Activities

| Data Asset Key | Display Name | Activity Types Included | Synonyms |
|----------------|--------------|------------------------|----------|
| `client_meeting_count` | Client Meetings | "Client Meeting", "Coffee Catch-up - Client" | client meetings, client catch-ups, client face-to-face |
| `candidate_meeting_count` | Candidate Meetings | "Coffee Catch-up - Candidate" | candidate meetings, candidate catch-ups, candidate interviews (non-client) |

### 📊 Aggregate Activities

| Data Asset Key | Display Name | Description | Calculation |
|----------------|--------------|-------------|-------------|
| `total_activity_count` | Total Activities | All logged activities | SUM of all activity types |
| `client_activity_count` | Client Touch Points | All client-facing activities | BD calls + AD calls + Client meetings |
| `candidate_activity_count` | Candidate Touch Points | All candidate-facing activities | Candidate calls + Candidate meetings |

---

## Questions for You

Please review the above and answer:

### 1. Activity Type Names
Are these the **exact** names as they appear in Bullhorn's `action` field?
- [ ] Yes, they match exactly
- [ ] No, I need to provide the exact names

If no, please provide the exact `action` values from Bullhorn:

**Client Side:**
- BD Call: `_______________________________`
- AD Call: `_______________________________`
- Client Meeting: `_______________________________`
- Coffee Catch-up Client: `_______________________________`

**Candidate Side:**
- Candidate Connect Call: `_______________________________`
- Candidate Follow-up: `_______________________________`
- Coffee Catch-up Candidate: `_______________________________`

### 2. Additional Activity Types
Are there any other activity types you want to track that I haven't listed?

Examples:
- [ ] Email activities (e.g., "Email - Client", "Email - Candidate")
- [ ] LinkedIn activities
- [ ] SMS/text messages
- [ ] Interviews (non-client, like screening calls)
- [ ] Reference checks
- [ ] Offer discussions
- [ ] Other: _______________________________

### 3. Categorization
Should we categorize activities differently? For example:

**Option A - By Recipient (current proposal):**
- BD Calls
- AD Calls
- Candidate Calls
- Client Meetings
- Candidate Meetings

**Option B - By Activity Type:**
- All Calls (BD + AD + Candidate)
- All Meetings (Client + Candidate)
- All Emails
- etc.

**Option C - By Stage:**
- Prospecting (BD calls, initial outreach)
- Account Management (AD calls, client meetings)
- Candidate Engagement (candidate calls, candidate meetings)

Which makes more sense for your dashboards?
- [ ] Option A - By Recipient
- [ ] Option B - By Activity Type
- [ ] Option C - By Stage
- [ ] Other: _______________________________

### 4. Leading vs Lagging
Which activities are **leading indicators** (predictive of future success)?

For example:
- More BD calls → More job orders (2-4 week lag)
- More candidate calls → More submittals (1 week lag)

This will help us design the AI context and metric relationships.

---

## Next Steps

Once you provide feedback:

1. I'll create a migration to add all confirmed activity data assets
2. We'll map the exact Bullhorn `action` values to each data asset
3. During Phase 2 ingestion, we'll filter activities by these mappings
4. You'll be able to query: "Show me my BD calls this month" or "How many client meetings did Auckland have?"

---

## Example Queries (once implemented)

With these data assets, users can ask:

**Individual Performance:**
- "How many BD calls did I make this week?"
- "Show me my client meetings vs target"
- "What's my candidate call activity over time?"

**Team Performance:**
- "Compare BD calls across all teams"
- "Show me Auckland's total client activity this month"
- "Which consultant had the most candidate meetings?"

**Conversion Analysis:**
- "BD calls to job orders conversion rate"
- "Candidate calls to submittal conversion"
- "Client meetings that led to placements"

---

## ✅ Your Feedback Needed

Please review this document and provide:
1. ✅ Exact activity type names from Bullhorn
2. ✅ Any additional activity types to track
3. ✅ Preferred categorization approach
4. ✅ Which activities are leading indicators

Once confirmed, I'll implement immediately!
