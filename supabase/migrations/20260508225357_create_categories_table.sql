/*
  # Create categories table

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique) — display name e.g. "Seguridad Industrial"
      - `slug` (text, unique) — url-safe key e.g. "seguridad-industrial"
      - `color` (text) — optional hex or tailwind color hint for UI
      - `description` (text, nullable)
      - `order_num` (integer) — for custom sort order in lists
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Seed data
    - Inserts the 6 existing hardcoded categories so no data is lost

  3. Security
    - Enable RLS
    - Authenticated users (admins) can read/write
    - Public (anon) can only SELECT active categories (needed for public portal)
*/

CREATE TABLE IF NOT EXISTS categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL,
  color       text NOT NULL DEFAULT '#0A2647',
  description text,
  order_num   integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  CONSTRAINT categories_name_unique UNIQUE (name),
  CONSTRAINT categories_slug_unique UNIQUE (slug)
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Public can read active categories"
  ON categories FOR SELECT
  TO anon
  USING (is_active = true);

-- Seed existing categories
INSERT INTO categories (name, slug, color, order_num) VALUES
  ('Calidad e Inocuidad',  'calidad-inocuidad',    '#059669', 1),
  ('Seguridad Industrial', 'seguridad-industrial',  '#DC2626', 2),
  ('Recursos Humanos',     'recursos-humanos',      '#2563EB', 3),
  ('Operaciones',          'operaciones',           '#D97706', 4),
  ('Medio Ambiente',       'medio-ambiente',        '#16A34A', 5),
  ('General',              'general',               '#64748B', 6)
ON CONFLICT (name) DO NOTHING;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_categories_updated_at();
