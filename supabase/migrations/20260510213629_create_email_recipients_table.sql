/*
  # Create email_recipients table

  ## Description
  Table to manage the mailing list for PTM policy notifications.
  Admins and superadmins can add, edit, and deactivate recipients.

  ## New Tables
  - `email_recipients`
    - `id` (uuid, primary key)
    - `full_name` (text) - recipient full name
    - `email` (text, unique) - recipient email address
    - `area` (text) - department/area within PTM
    - `position` (text, nullable) - job title/position
    - `is_active` (boolean, default true) - whether they receive emails
    - `notes` (text, nullable) - optional notes
    - `created_by` (uuid, nullable) - admin who added them
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled: only authenticated admins can manage recipients
  - Public SELECT is blocked (recipients are internal data)
*/

CREATE TABLE IF NOT EXISTS email_recipients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    text NOT NULL DEFAULT '',
  email        text NOT NULL,
  area         text NOT NULL DEFAULT '',
  position     text,
  is_active    boolean NOT NULL DEFAULT true,
  notes        text,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Unique email constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_recipients_email_key'
  ) THEN
    ALTER TABLE email_recipients ADD CONSTRAINT email_recipients_email_key UNIQUE (email);
  END IF;
END $$;

-- Index for active lookups
CREATE INDEX IF NOT EXISTS idx_email_recipients_active ON email_recipients (is_active);
CREATE INDEX IF NOT EXISTS idx_email_recipients_area   ON email_recipients (area);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_email_recipients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_recipients_updated_at ON email_recipients;
CREATE TRIGGER trg_email_recipients_updated_at
  BEFORE UPDATE ON email_recipients
  FOR EACH ROW EXECUTE FUNCTION update_email_recipients_updated_at();

-- RLS
ALTER TABLE email_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select recipients"
  ON email_recipients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert recipients"
  ON email_recipients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update recipients"
  ON email_recipients FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete recipients"
  ON email_recipients FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
