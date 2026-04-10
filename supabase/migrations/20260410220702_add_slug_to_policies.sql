/*
  # Add slug column to policies table

  ## Summary
  Adds a `slug` column to the `policies` table to generate human-readable, SEO-friendly URLs
  for each policy. The slug is derived from the policy title plus a short portion of the UUID.

  ## Changes
  - `policies` table: new `slug` column (text, unique)
  - Generates slugs for all existing records using their title + first 6 chars of UUID
  - Adds a unique index on slug for fast lookups
  - Updates RLS: existing policies apply (no new policies needed)

  ## Format
  slug = slugified-title + "-" + first6charsOfId
  Example: "politica-de-calidad-abc123"
*/

ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS slug text;

DO $$
DECLARE
  rec RECORD;
  base_slug text;
BEGIN
  FOR rec IN SELECT id, title FROM policies WHERE slug IS NULL OR slug = '' LOOP
    base_slug := lower(
      regexp_replace(
        regexp_replace(
          translate(
            rec.title,
            'áàäâãåÁÀÄÂÃÅéèëêÉÈËÊíìïîÍÌÏÎóòöôõÓÒÖÔÕúùüûÚÙÜÛñÑçÇ',
            'aaaaaaaaaaaaeeeeeeeeiiiiiiiioooooooooouuuuuuuunncc'
          ),
          '[^a-z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
      )
    );
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    UPDATE policies
      SET slug = base_slug || '-' || left(replace(rec.id::text, '-', ''), 6)
    WHERE id = rec.id;
  END LOOP;
END $$;

ALTER TABLE policies
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS policies_slug_idx ON policies (slug);
