# Azure SQL Server Setup for Potentia Certus
*Instructions for Azure Administrator*

## Overview

Potentia Certus needs **read-only access** to your Azure SQL Server database that mirrors Bullhorn data. We'll connect via a Supabase Edge Function that runs on a scheduled basis (every 5-15 minutes) to sync data into our PostgreSQL database.

## Part 1: Connection Details Needed

Please provide the following information:

### 1. SQL Server Connection String Components

**Based on previous analysis, we know the database name. Please provide the connection details:**

```
Server (Fully Qualified Domain Name): _______________________________
Example: yourserver.database.windows.net

Port: _______________________________
Default: 1433 (or provide if different)

Database Name: TargetJobsDB ✅ (Already confirmed)

Username: _______________________________
Recommendation: Create a new read-only user (see Part 2)
                Use name: potentia_readonly

Password: _______________________________
Provide securely (not via email - see Part 9)
```

### 2. Authentication Method
- [ ] SQL Server Authentication (username/password) - **RECOMMENDED**
- [ ] Azure AD Authentication (if you prefer managed identity)

**Note:** SQL Server Authentication is simpler for our use case. We'll store credentials in Supabase Vault (encrypted).

---

## Part 2: Create Read-Only Database User (REQUIRED)

**Why:** Security best practice. Our application should only have SELECT permissions, never UPDATE/DELETE/INSERT.

**Execute these SQL commands in Azure SQL:**

```sql
-- Step 1: Create login at server level
-- (Run this in the master database)
USE master;
GO

CREATE LOGIN potentia_readonly
WITH PASSWORD = 'GENERATE_STRONG_PASSWORD_HERE';
GO

-- Step 2: Create user in your Bullhorn database
-- (Switch to TargetJobsDB database)
USE [TargetJobsDB];
GO

CREATE USER potentia_readonly FOR LOGIN potentia_readonly;
GO

-- Step 3: Grant read-only permissions
ALTER ROLE db_datareader ADD MEMBER potentia_readonly;
GO

-- Step 4: Verify permissions (should show db_datareader)
SELECT
    dp.name AS DatabaseRole,
    USER_NAME(drm.member_principal_id) AS UserName
FROM sys.database_role_members drm
JOIN sys.database_principals dp ON drm.role_principal_id = dp.principal_id
WHERE USER_NAME(drm.member_principal_id) = 'potentia_readonly';
GO
```

**After creating the user, provide:**
- Username: `potentia_readonly`
- Password: (the strong password you generated)

---

## Part 3: Firewall Configuration (CRITICAL)

**Problem:** By default, Azure SQL Server blocks all external connections. Supabase Edge Functions need to reach your server.

**Solution: Allow Supabase IP ranges**

### Option A: Specific IP Ranges (RECOMMENDED)

Supabase Edge Functions run from these IP ranges (as of 2024):

```
35.240.242.0/24 (Asia Pacific - Sydney)
34.116.88.0/24 (Asia Pacific - Sydney)
35.197.155.0/24 (Asia Pacific - Sydney)
```

**Execute in Azure Portal:**

1. Navigate to: **Azure SQL Server** → **Security** → **Networking**
2. Under **Firewall rules**, add these three rules:
   - Rule 1: Name: `Supabase-Sydney-1`, Start IP: `35.240.242.0`, End IP: `35.240.242.255`
   - Rule 2: Name: `Supabase-Sydney-2`, Start IP: `34.116.88.0`, End IP: `34.116.88.255`
   - Rule 3: Name: `Supabase-Sydney-3`, Start IP: `35.197.155.0`, End IP: `35.197.155.255`
3. **Important:** Ensure "Allow Azure services and resources to access this server" is **OFF** (more secure)

### Option B: Temporary Wide-Open for Testing (NOT RECOMMENDED FOR PRODUCTION)

For initial testing only:
1. Add firewall rule: `0.0.0.0` to `255.255.255.255` (allows all IPs)
2. **WARNING:** This is insecure. Use only for initial connection test.
3. **Remove this rule immediately** after verifying connection works.
4. Replace with Option A for production.

### Option C: Private Endpoint / VPN (Most Secure, Complex)

If your Azure SQL is behind a VPN or uses Private Link:
- We'll need to set up a VPN tunnel or Azure Relay
- Contact us to discuss architecture
- This is more complex but offers the best security

---

## Part 4: Table and Column Mapping

**Based on our previous analysis, we already know your SQL Server structure.** Please confirm these are still accurate:

### Core Tables (Already Identified)

| Bullhorn Entity | SQL Server Table | Key Columns | Status |
|-----------------|------------------|-------------|--------|
| **Candidates** | `Persons` (WHERE _subtype='Candidate') | id, firstName, lastName, email, status, ownerID, dateAdded, dateLastModified | ✅ Confirmed |
| **Submission History** | `SubmissionHistory` | id, candidateID, jobOrderID, status, dateAdded, dateLastModified, sendingUserID | ✅ Confirmed |
| **Current Submissions** | `Submissions` | id, candidateID, jobOrderID, status, dateAdded, dateLastModified | ✅ Confirmed |
| **Job Orders** | `JobOrders` | id, title, clientCorporationID, status, ownerID, dateAdded, dateLastModified | ✅ Confirmed |
| **Placements** | `Placements` | id, candidateID, jobOrderID, startDate, employmentType, fee (Margin), dateAdded, ownerID | ✅ Confirmed |
| **Activities/Notes** | `Notes` (WHERE isDeleted=0) | id, personReferenceID, commentingPersonID, action, dateAdded, comments | ✅ Confirmed |
| **Corporate Users** | `CorporateUsers` | id, firstName, lastName, email, enabled, dateLastModified | ⚠️ Please confirm |
| **Client Corporations** | `ClientCorporations` | id, name, status, ownerID, dateAdded, dateLastModified | ✅ Confirmed |
| **Departments** | `Departments` | id, name, parentDepartmentID | ✅ Confirmed |

### Activity Types in Notes Table (Already Analyzed)

**Activity Type Column:** `action` (in Notes table)

**Top Activity Types (by volume):**
- ✅ "Candidate Connect/Follow Up" (12,656 records)
- ✅ "LMTCB" (Left Message To Call Back - 5,884 records)
- ✅ "Candidate Screening Call" (3,865 records)
- ✅ "AM Call" (Account Management - 2,649 records)
- ✅ "AD Call" (Account Development - 1,302 records)
- ✅ "Coffee Catch Up - Client" (1,275 records)
- ✅ "BD Call" (Business Development - 594 records)
- ✅ "BD Meeting" (447 records)
- ✅ "Interview Feedback" (460 records)
- ✅ "Reference Check Call" (243 records)

**Total:** 42 distinct activity types, 36,263 total activities analyzed.

**Please confirm:**
- [ ] These table names are still accurate
- [ ] The `action` column in Notes contains these exact values
- [ ] The `isDeleted` column exists for filtering

### Modified Records Detection

How can we identify records that changed since our last sync?

```
Modified Timestamp Column: _________________________
Example: "dateLastModified", "lastModifiedDate", "updatedAt"

Does every table have this column? [ ] Yes  [ ] No

If No, which tables are missing it: _________________________
```

---

## Part 5: Connection Testing

After providing the details above, we'll test the connection. Please ensure:

### Azure SQL Configuration Checklist

- [ ] Read-only user created (`potentia_readonly`)
- [ ] User has `db_datareader` role
- [ ] Firewall rules added for Supabase IP ranges
- [ ] Server allows TCP connections on port 1433
- [ ] SSL/TLS is enabled (default in Azure, but verify)
- [ ] No additional authentication layers (e.g., MFA for service accounts)

### Quick Connection Test (Optional - You Can Run This)

If you want to verify the credentials work before giving them to us:

```sql
-- Test query that we'll run to verify connection
SELECT
    TABLE_SCHEMA,
    TABLE_NAME,
    (SELECT COUNT(*)
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME = t.TABLE_NAME
       AND TABLE_SCHEMA = t.TABLE_SCHEMA) AS ColumnCount
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
```

This query should return a list of all tables. If it works for you with the `potentia_readonly` user, it will work for us.

---

## Part 6: Data Volume Estimates

Please provide approximate row counts (helps us optimize sync strategy):

```
Candidates:          __________ rows
Job Submissions:     __________ rows
Job Orders:          __________ rows
Placements:          __________ rows
Notes/Activities:    __________ rows
Corporate Users:     __________ rows
Client Corps:        __________ rows

Records modified per day (average): __________
Records added per day (average):    __________
```

---

## Part 7: Bullhorn Mirror Refresh Schedule

**Critical for our sync strategy:**

```
How often does your SQL Server mirror refresh from Bullhorn?

[ ] Real-time (CDC/triggers)
[ ] Every 5 minutes
[ ] Every 15 minutes
[ ] Every 30 minutes
[ ] Hourly
[ ] Other: _______________

Is the refresh schedule consistent or variable? _______________

Are there any time windows with no updates (e.g., nights/weekends)? _______________
```

This tells us how fresh the data will be and how often we should sync.

---

## Part 8: Security & Compliance

### Data Sensitivity

```
Does this database contain:
[ ] Candidate personal information (names, emails, phone numbers)
[ ] Salary information
[ ] Client confidential information
[ ] NZ-specific data requiring Privacy Act compliance

Your company's data classification: _________________________
Example: "Confidential", "Highly Confidential", "Internal"
```

### Audit Requirements

```
Do you require us to log all queries executed against your database?
[ ] Yes - we need query audit logs
[ ] No - connection-level monitoring is sufficient

Do you need to review our data processing agreement?
[ ] Yes - please send DPA for review
[ ] No - standard terms acceptable
```

---

## Part 9: Credentials Delivery (SECURE)

**DO NOT send credentials via email or Slack.**

Choose one secure method:

### Option A: Azure Key Vault (Most Secure)
1. Store credentials in your Azure Key Vault
2. Grant our service principal read access
3. Provide vault URL and secret names

### Option B: Password Manager (Recommended)
1. Use 1Password, LastPass, or Bitwarden shared vault
2. Share the read-only user credentials via secure link
3. Set link to expire after 7 days

### Option C: Encrypted File (Acceptable)
1. Create a text file with connection details
2. Encrypt with GPG or 7-Zip (AES-256)
3. Share encrypted file via link
4. Share password via separate channel (SMS, phone call)

### Option D: In-Person/Video Call (Simple)
1. Schedule a brief call
2. Verbally provide credentials
3. We'll store in Supabase Vault immediately
4. No credentials transmitted in writing

---

## Part 10: Post-Setup Verification

After we receive credentials, we'll:

1. **Test connection** from our development environment
2. **Verify read access** to all required tables
3. **Run sample queries** to confirm data structure matches expectations
4. **Set up monitoring** to detect connection issues
5. **Schedule initial sync** (we'll notify you before running)

**We'll notify you when:**
- Connection test succeeds ✅
- Initial data sync completes ✅
- Scheduled sync is running ✅

---

## Part 11: Ongoing Maintenance

### What We'll Do
- Monitor connection health 24/7
- Alert you if connection fails
- Respect your Azure SQL performance (throttle queries if needed)
- Never write/modify data (read-only only)

### What You Should Monitor
- Azure SQL performance metrics (CPU, DTU usage)
- Firewall rule changes (ensure Supabase IPs remain allowed)
- User permission changes (ensure `potentia_readonly` retains `db_datareader`)

### Expected Query Pattern
```
Frequency:    Every 5-15 minutes (configurable)
Query Type:   SELECT with WHERE clause (modified since last sync)
Typical Load: ~50-200 rows per sync (after initial full sync)
Peak Load:    Initial sync may pull all historical data (one-time)
```

---

## Part 12: Troubleshooting Common Issues

### Issue 1: Connection Timeout
**Symptoms:** "Cannot connect to server" error
**Fix:** Verify firewall rules include Supabase IP ranges

### Issue 2: Login Failed
**Symptoms:** "Login failed for user 'potentia_readonly'"
**Fix:** Verify user exists in both master DB and your Bullhorn DB

### Issue 3: Permission Denied
**Symptoms:** "SELECT permission denied on table X"
**Fix:** Ensure user has `db_datareader` role

### Issue 4: Slow Queries
**Symptoms:** Queries taking >10 seconds
**Fix:** Ensure indexes exist on `dateLastModified` columns

---

## Quick Summary Checklist

Hand this to your developer:

- [ ] Create read-only SQL user: `potentia_readonly`
- [ ] Grant `db_datareader` role to that user
- [ ] Add Supabase firewall rules (3 IP ranges)
- [ ] Fill out table/column mapping (Part 4)
- [ ] Provide row count estimates (Part 6)
- [ ] Confirm Bullhorn refresh schedule (Part 7)
- [ ] Send credentials securely (Part 9)
- [ ] Test connection with provided query (Part 5)

---

## Questions or Issues?

If your developer encounters any issues or has questions:

**Contact:** [Your contact info here]

**Common Questions:**
- "Can we use a VPN instead of IP allowlist?" → Yes, let's discuss architecture
- "Can you use Azure AD auth instead?" → Yes, but SQL auth is simpler to start
- "Do you need write access for testing?" → No, strictly read-only
- "What if our mirror is in a different Azure region?" → That's fine, works globally
- "How do we revoke access later?" → Drop the `potentia_readonly` user and remove firewall rules

---

## Expected Timeline

Once you provide all information above:
- **Connection test:** Same day
- **Initial sync:** 1-2 days
- **Production sync:** 2-3 days

We'll keep you updated at each stage.
