-- Add company_name and occupation to candidates table
-- These map from TargetJobsDB.Persons (Bullhorn Person entity)
-- Needed for drill-down: BD calls/client meetings reference client contacts, not candidates

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS occupation TEXT;

-- Index for company name lookups (used in drill-down display)
CREATE INDEX IF NOT EXISTS idx_candidates_company_name ON candidates (company_name)
  WHERE company_name IS NOT NULL;
