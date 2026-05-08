/*
  # Add is_internal flag to policies

  1. Changes
    - `policies` table: new boolean column `is_internal`
      - DEFAULT false → "Política Externa" (descargable, imprimible)
      - true          → "Política Interna" (solo lectura en visor, sin descarga ni impresión)

  2. Notes
    - Existing policies default to false (externa/pública) to preserve current behavior.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'is_internal'
  ) THEN
    ALTER TABLE policies ADD COLUMN is_internal boolean NOT NULL DEFAULT false;
  END IF;
END $$;
