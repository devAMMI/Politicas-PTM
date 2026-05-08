/*
  # Policy Status & Archive System

  ## Summary
  Implements a full lifecycle management system for policies.

  ## New Columns on `policies`
  - `status` (text): One of 'published' | 'hidden' | 'archived' | 'deleted'
    - published  → visible to all collaborators
    - hidden     → saved but not visible publicly (draft/review)
    - archived   → kept for audit/history, not shown in main list
    - deleted    → soft-delete, in trash, can be restored or permanently removed
  - `deleted_at` (timestamptz): timestamp when moved to trash (nullable)
  - `archived_at` (timestamptz): timestamp when archived (nullable)
  - `folder_path` (text): logical folder path for the archive browser
    e.g. "PTM/RRHH/2026" or "PTM/Calidad e Inocuidad/2026"

  ## Migration Strategy
  - Existing rows with is_published=true  → status='published'
  - Existing rows with is_published=false → status='hidden'
  - is_published column kept for backward compatibility (synced via trigger)

  ## Security
  - No RLS changes needed (existing policies cover the table)
*/

-- status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'status'
  ) THEN
    ALTER TABLE policies ADD COLUMN status text NOT NULL DEFAULT 'hidden'
      CHECK (status IN ('published', 'hidden', 'archived', 'deleted'));
  END IF;
END $$;

-- Backfill status from is_published
UPDATE policies
SET status = CASE WHEN is_published THEN 'published' ELSE 'hidden' END
WHERE status = 'hidden';

-- deleted_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE policies ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- archived_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE policies ADD COLUMN archived_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- folder_path: logical folder for archive browser
-- Default auto-generated from category + year
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'folder_path'
  ) THEN
    ALTER TABLE policies ADD COLUMN folder_path text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Backfill folder_path from category + year
UPDATE policies
SET folder_path = category || '/' || EXTRACT(YEAR FROM published_at)::text
WHERE folder_path = '';

-- Index for fast status filtering
CREATE INDEX IF NOT EXISTS policies_status_idx ON policies(status);
CREATE INDEX IF NOT EXISTS policies_folder_path_idx ON policies(folder_path);
CREATE INDEX IF NOT EXISTS policies_policy_number_idx ON policies(policy_number);

-- Trigger: keep is_published in sync with status
CREATE OR REPLACE FUNCTION sync_is_published_from_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_published := (NEW.status = 'published');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_is_published ON policies;
CREATE TRIGGER trg_sync_is_published
  BEFORE INSERT OR UPDATE OF status ON policies
  FOR EACH ROW EXECUTE FUNCTION sync_is_published_from_status();
