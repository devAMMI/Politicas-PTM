/*
  # Fix admin_users SELECT policy recursion

  The existing SELECT policy uses a recursive subquery to check if the caller
  is a superadmin, but that subquery itself requires passing the SELECT policy —
  creating an infinite loop that silently returns false.

  Fix: replace the SELECT policy so it first allows reading own row (no recursion),
  then uses a security-definer function to safely check the caller's role for
  viewing other users' rows.
*/

-- Drop the recursive SELECT policy
DROP POLICY IF EXISTS "Admins can view peer and own records" ON admin_users;

-- Create a security-definer function that bypasses RLS to get the caller's role
CREATE OR REPLACE FUNCTION get_my_admin_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM admin_users WHERE id = auth.uid() LIMIT 1;
$$;

-- New non-recursive SELECT policy
CREATE POLICY "Admins can view peer and own records"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR (
      get_my_admin_role() = 'superadmin'
    )
    OR (
      get_my_admin_role() = 'admin'
      AND role = 'admin'
    )
  );
