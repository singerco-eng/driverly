-- =============================================================================
-- Migration: 034_remove_primary_location.sql
-- Description: Removes the primary location concept from company_locations.
-- =============================================================================

-- Clear existing primary flags before dropping the column.
UPDATE company_locations
SET is_primary = false
WHERE is_primary = true;

-- Drop the trigger and function enforcing a single primary location.
DROP TRIGGER IF EXISTS trg_enforce_single_primary_location ON company_locations;
DROP FUNCTION IF EXISTS enforce_single_primary_location();

-- Drop index that depended on is_primary.
DROP INDEX IF EXISTS idx_company_locations_primary;

-- Remove the column entirely.
ALTER TABLE company_locations
  DROP COLUMN IF EXISTS is_primary;
