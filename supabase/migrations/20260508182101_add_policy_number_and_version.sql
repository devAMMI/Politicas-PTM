/*
  # Add policy_number, version, and department fields

  1. Changes
    - `policies`: add `policy_number` (integer, auto-increment, unique) – sequential ID legible
    - `policies`: add `version` (text, default '1.0')
    - `policies`: add `department` (text, optional sub-área)

  2. Notes
    - Existing rows are backfilled in creation order (oldest = #1)
    - New rows get the next available number automatically via sequence
*/

-- Add policy_number column if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'policy_number'
  ) THEN
    ALTER TABLE policies ADD COLUMN policy_number integer;
  END IF;
END $$;

-- Create sequence
CREATE SEQUENCE IF NOT EXISTS policies_policy_number_seq START 1;

-- Backfill existing rows ordered by created_at
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM policies
  WHERE policy_number IS NULL
)
UPDATE policies
SET policy_number = numbered.rn
FROM numbered
WHERE policies.id = numbered.id;

-- Advance sequence past current max
SELECT setval('policies_policy_number_seq', COALESCE((SELECT MAX(policy_number) FROM policies), 0) + 1, false);

-- Set default for new rows
ALTER TABLE policies ALTER COLUMN policy_number SET DEFAULT nextval('policies_policy_number_seq');

-- Enforce NOT NULL after backfill
ALTER TABLE policies ALTER COLUMN policy_number SET NOT NULL;

-- Add unique constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'policies_policy_number_unique'
  ) THEN
    ALTER TABLE policies ADD CONSTRAINT policies_policy_number_unique UNIQUE (policy_number);
  END IF;
END $$;

-- version column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'version'
  ) THEN
    ALTER TABLE policies ADD COLUMN version text NOT NULL DEFAULT '1.0';
  END IF;
END $$;

-- department column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'department'
  ) THEN
    ALTER TABLE policies ADD COLUMN department text NOT NULL DEFAULT '';
  END IF;
END $$;
