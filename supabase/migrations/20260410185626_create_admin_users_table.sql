/*
  # Admin Users Management

  ## Summary
  Creates a table to manage admin users with roles for the PTM internal portal.
  This table links to Supabase auth.users and extends it with role information.

  ## New Tables

  ### `admin_users`
  - `id` (uuid, PK, FK -> auth.users) - Links to Supabase auth user
  - `email` (text, unique) - User email address
  - `full_name` (text) - Display name
  - `role` (text) - Role: 'superadmin' or 'admin'
  - `is_active` (boolean) - Whether the user can log in
  - `created_at` (timestamptz) - When the record was created
  - `created_by` (uuid, FK -> auth.users) - Who created this admin user

  ## Security
  - RLS enabled
  - Only authenticated users can read admin_users
  - Only superadmins can insert/update/delete admin_users
*/

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view admin_users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Superadmins can insert admin_users"
  ON admin_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid() AND role = 'superadmin' AND is_active = true
    )
  );

CREATE POLICY "Superadmins can update admin_users"
  ON admin_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid() AND role = 'superadmin' AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid() AND role = 'superadmin' AND is_active = true
    )
  );

CREATE POLICY "Superadmins can delete admin_users"
  ON admin_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid() AND role = 'superadmin' AND is_active = true
    )
  );
