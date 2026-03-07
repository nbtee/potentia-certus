-- Add salary_unit to job_orders for daily rate contract handling.
-- When salary_unit is 'Per Day', rates represent daily amounts and must
-- be divided by working hours (typically 8) to get hourly GP.
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS salary_unit TEXT;
