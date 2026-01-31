-- Update Starter plan operator limit to 20 operators.
UPDATE billing_plans
SET operator_limit = 20
WHERE slug = 'starter';
