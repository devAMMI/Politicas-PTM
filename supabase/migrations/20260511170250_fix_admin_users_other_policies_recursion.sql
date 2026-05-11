/*
  # Fix remaining admin_users policies that use recursive subqueries

  Replace INSERT, UPDATE and DELETE policies with non-recursive versions
  that use the get_my_admin_role() security-definer function.
*/

DROP POLICY IF EXISTS "Admins can create admin-level users" ON admin_users;
DROP POLICY IF EXISTS "Admins can update peer admin records" ON admin_users;
DROP POLICY IF EXISTS "Admins can delete peer admin records" ON admin_users;

CREATE POLICY "Admins can create admin-level users"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (get_my_admin_role() = 'superadmin')
    OR (get_my_admin_role() = 'admin' AND role = 'admin')
  );

CREATE POLICY "Admins can update peer admin records"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR get_my_admin_role() = 'superadmin'
    OR (get_my_admin_role() = 'admin' AND role = 'admin')
  )
  WITH CHECK (
    id = auth.uid()
    OR get_my_admin_role() = 'superadmin'
    OR (get_my_admin_role() = 'admin' AND role = 'admin')
  );

CREATE POLICY "Admins can delete peer admin records"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (
    id <> auth.uid()
    AND (
      get_my_admin_role() = 'superadmin'
      OR (get_my_admin_role() = 'admin' AND role = 'admin')
    )
  );
