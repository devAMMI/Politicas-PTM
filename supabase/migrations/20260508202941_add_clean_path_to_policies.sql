/*
  # Add clean_path column for logical document URLs

  ## Summary
  Adds a `document_clean_path` column that stores a human-readable, logical
  path for the document file. This path is used to build clean URLs in the app
  (e.g. /docs/politicas/RRHH/PTM/politica-conflicto-2026.pdf) which redirect
  to the actual Supabase Storage URL via an Edge Function proxy.

  ## New Column
  - `document_clean_path` (text, nullable): logical path segment used for clean URLs
    Example: "politicas/RRHH/PTM/politica-conflicto-de-interes-2026.pdf"

  ## Notes
  - The full clean URL is: {APP_ORIGIN}/docs/{document_clean_path}
  - The Edge Function `doc-proxy` maps this path to the real storage URL in DB
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'document_clean_path'
  ) THEN
    ALTER TABLE policies ADD COLUMN document_clean_path text DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS policies_document_clean_path_idx
  ON policies(document_clean_path)
  WHERE document_clean_path IS NOT NULL;
