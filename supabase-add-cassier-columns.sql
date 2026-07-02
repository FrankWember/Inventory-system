-- Migration: Add cassier_cost and cassier_quantity columns to drinks table
-- These columns track the cost and quantity for bulk purchases (cassiers/cases)

-- Add cassier_quantity column (number of units per cassier/case)
-- Default to rack_size for backward compatibility
ALTER TABLE drinks
  ADD COLUMN IF NOT EXISTS cassier_quantity INTEGER;

-- Set cassier_quantity to rack_size for existing records
UPDATE drinks
SET cassier_quantity = rack_size
WHERE cassier_quantity IS NULL;

-- Now make it NOT NULL with a default
ALTER TABLE drinks
  ALTER COLUMN cassier_quantity SET DEFAULT 12,
  ALTER COLUMN cassier_quantity SET NOT NULL;

-- Add cassier_cost column (cost per cassier/case in FCFA)
-- Default to cost * rack_size for backward compatibility
ALTER TABLE drinks
  ADD COLUMN IF NOT EXISTS cassier_cost INTEGER;

-- Set cassier_cost based on existing cost and rack_size
UPDATE drinks
SET cassier_cost = cost * rack_size
WHERE cassier_cost IS NULL;

-- Now make it NOT NULL with a default
ALTER TABLE drinks
  ALTER COLUMN cassier_cost SET DEFAULT 0,
  ALTER COLUMN cassier_cost SET NOT NULL;
