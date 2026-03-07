-- Add rate fields to job_orders for contract pipeline GP/hr calculation.
-- Sourced from Bullhorn JobOrder: payRate, clientBillRate, salary.
-- Enriched via bullhorn-enrich.js → SQL Server mirror → full-sync/Azure Function.

ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS pay_rate NUMERIC(10,2);
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS bill_rate NUMERIC(10,2);
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS salary NUMERIC(12,2);
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS salary_unit TEXT;
