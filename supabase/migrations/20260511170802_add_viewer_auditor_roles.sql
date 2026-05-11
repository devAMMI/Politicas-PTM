/*
  # Add viewer and auditor roles

  ## Summary
  Extends the admin_users role system to support 4 levels:
  - superadmin: full control, can manage all roles
  - admin: can manage admin, auditor, viewer
  - auditor: can approve/reject policies (future flow), read-only otherwise
  - viewer: read-only access to the admin panel

  ## Changes
  - No schema change needed (role column is plain text)
  - Updates get_my_admin_role() — already exists, no changes needed
  - Updates RLS policies to reflect new role hierarchy

  ## Role hierarchy (top to bottom)
    superadmin > admin > auditor > viewer

  Each role can create/manage roles at the same level and below.
*/

-- Re-create the SELECT policy to allow viewers/auditors to see themselves
DROP POLICY IF EXISTS "Admins can view peer and own records" ON admin_users;

CREATE POLICY "Admins can view peer and own records"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    -- Always allow reading own record
    id = auth.uid()
    -- superadmin sees everyone
    OR get_my_admin_role() = 'superadmin'
    -- admin sees admin, auditor, viewer
    OR (
      get_my_admin_role() = 'admin'
      AND role IN ('admin', 'auditor', 'viewer')
    )
    -- auditor/viewer only see themselves (covered by id = auth.uid() above)
  );

-- Re-create INSERT policy
DROP POLICY IF EXISTS "Admins can create admin-level users" ON admin_users;

CREATE POLICY "Admins can create admin-level users"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- superadmin can create any role
    get_my_admin_role() = 'superadmin'
    -- admin can create admin, auditor, viewer
    OR (get_my_admin_role() = 'admin' AND role IN ('admin', 'auditor', 'viewer'))
  );

-- Re-create UPDATE policy
DROP POLICY IF EXISTS "Admins can update peer admin records" ON admin_users;

CREATE POLICY "Admins can update peer admin records"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR get_my_admin_role() = 'superadmin'
    OR (get_my_admin_role() = 'admin' AND role IN ('admin', 'auditor', 'viewer'))
  )
  WITH CHECK (
    id = auth.uid()
    OR get_my_admin_role() = 'superadmin'
    OR (get_my_admin_role() = 'admin' AND role IN ('admin', 'auditor', 'viewer'))
  );

-- Re-create DELETE policy
DROP POLICY IF EXISTS "Admins can delete peer admin records" ON admin_users;

CREATE POLICY "Admins can delete peer admin records"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (
    id <> auth.uid()
    AND (
      get_my_admin_role() = 'superadmin'
      OR (get_my_admin_role() = 'admin' AND role IN ('admin', 'auditor', 'viewer'))
    )
  );
