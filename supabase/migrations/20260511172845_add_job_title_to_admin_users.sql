/*
  # Add job_title column to admin_users

  Adds an optional job_title (text) column to store the user's position/cargo.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'job_title'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN job_title text DEFAULT '';
  END IF;
END $$;
