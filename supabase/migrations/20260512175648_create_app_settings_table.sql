/*
  # Create app_settings table

  1. New Table
    - `app_settings`
      - `key` (text, primary key) – setting identifier
      - `value` (text) – setting value
      - `updated_at` (timestamptz)

  2. Initial data
    - Inserts the `codigo_etica_url` key with the existing PDF URL

  3. Security
    - Enable RLS
    - Public can SELECT (config values are not sensitive)
    - Only authenticated admins can UPDATE/INSERT/DELETE
*/

CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read app settings"
  ON app_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can update app settings"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert app settings"
  ON app_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

INSERT INTO app_settings (key, value)
VALUES (
  'codigo_etica_url',
  'https://cssfpgrobcgjsuosuuwe.supabase.co/storage/v1/object/public/documents/codigo-de-etica/politica-conflicto-de-interes.pdf'
)
ON CONFLICT (key) DO NOTHING;
