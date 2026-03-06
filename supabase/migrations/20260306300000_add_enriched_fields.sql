-- Add enriched fields from Bullhorn REST API (via bullhorn-enrich.js → SQL Server → full-sync)

-- Placements: hours_per_day and working_days_per_week for accurate contract revenue calculation
-- Previously hardcoded at 8 hrs/day. Now sourced from Bullhorn Placement.hoursPerDay and customInt2.
ALTER TABLE placements ADD COLUMN IF NOT EXISTS hours_per_day NUMERIC(10,2);
ALTER TABLE placements ADD COLUMN IF NOT EXISTS working_days_per_week INTEGER;

-- Job orders: status field (e.g. "Accepting Candidates", "Placed", "Closed")
-- Previously used 90-day date_last_modified as proxy for "open" jobs.
-- status column already exists but confirm it's populated by sync.

-- Activities: notes column already exists (TEXT), will be populated from Note.comments.

-- Candidates: company_name column already exists (TEXT), will be populated via
-- ClientContact → ClientCorporation mapping.

-- User profiles: is_active column already exists (BOOLEAN), will be populated from
-- CorporateUser.enabled.
