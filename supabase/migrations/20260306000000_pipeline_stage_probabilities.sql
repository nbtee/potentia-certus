-- Pipeline Stage Probabilities
-- Seed conversion probabilities for pipeline revenue forecasting.
-- Each row maps a submission status to a probability (0.0 – 1.0).
-- Editable via Admin > Business Rules UI.

INSERT INTO business_rules (rule_type, rule_key, rule_value, effective_from, description) VALUES
('pipeline_probability', 'Submittal',       '{"probability": 0.10}'::jsonb, '2026-01-01', 'Submittal stage — 10% conversion probability'),
('pipeline_probability', 'Client Interview 1',  '{"probability": 0.30}'::jsonb, '2026-01-01', 'CI 1 stage — 30% conversion probability'),
('pipeline_probability', 'Client Interview 2',  '{"probability": 0.50}'::jsonb, '2026-01-01', 'CI 2 stage — 50% conversion probability'),
('pipeline_probability', 'Client Interview Final', '{"probability": 0.65}'::jsonb, '2026-01-01', 'CI Final stage — 65% conversion probability'),
('pipeline_probability', 'Offer Extended',   '{"probability": 0.80}'::jsonb, '2026-01-01', 'Offer Extended stage — 80% conversion probability'),
('pipeline_probability', 'Reference',        '{"probability": 0.82}'::jsonb, '2026-01-01', 'Reference stage — 82% conversion probability'),
('pipeline_probability', 'Placed',           '{"probability": 1.00}'::jsonb, '2026-01-01', 'Placed stage — 100% (confirmed revenue)');
