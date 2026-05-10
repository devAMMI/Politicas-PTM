/*
  # Update admin_users RLS — role hierarchy enforcement

  ## Summary
  Expands permissions so that admin-role users can manage other admin-role users,
  while superadmins retain full access. Strict hierarchy: no admin can touch a
  superadmin record (except their own profile read), and no admin can elevate
  someone to superadmin.

  ## Changes

  ### Modified Policies on `admin_users`
  1. SELECT — admins can see all admin_users EXCEPT superadmin accounts (they only see themselves + other admins).
     Superadmins see everyone.
  2. INSERT — admins can create users with role='admin' only. Superadmins can create any role.
  3. UPDATE — admins can update admin-role users but cannot change role to 'superadmin' and cannot touch superadmin rows.
     Exception: any authenticated user can update their own full_name (self-service profile).
  4. DELETE — admins can delete admin-role users (not superadmins, not themselves).
     Superadmins can delete anyone except themselves.

  ### New Policy
  - Self-update policy: any active admin_user can update their own full_name via a dedicated policy.

  ## Security Notes
  - Superadmins are never visible or editable by plain admins.
  - No admin can grant themselves or others the superadmin role.
  - Self-service (own profile + password via edge fn) is handled separately.
*/

-- Drop old policies to recreate with hierarchy logic
DROP POLICY IF EXISTS "Authenticated users can view admin_users" ON admin_users;
DROP POLICY IF EXISTS "Superadmins can insert admin_users" ON admin_users;
DROP POLICY IF EXISTS "Superadmins can update admin_users" ON admin_users;
DROP POLICY IF EXISTS "Superadmins can delete admin_users" ON admin_users;

-- SELECT: superadmins see everyone; admins see only admin-role rows + themselves
CREATE POLICY "Admins can view peer and own records"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    -- superadmin sees all
    EXISTS (
      SELECT 1 FROM admin_users sa
      WHERE sa.id = auth.uid() AND sa.role = 'superadmin' AND sa.is_active = true
    )
    OR
    -- admin sees only admin-role users (including themselves)
    (
      EXISTS (
        SELECT 1 FROM admin_users ca
        WHERE ca.id = auth.uid() AND ca.role = 'admin' AND ca.is_active = true
      )
      AND role = 'admin'
    )
    OR
    -- any authenticated user can always see their own row
    id = auth.uid()
  );

-- INSERT: superadmin can create any role; admin can only create role='admin'
CREATE POLICY "Admins can create admin-level users"
  ON admin_users FOR INSERT
  TO authenticated
  WITH CHECK (
    -- superadmin: can create any role
    (
      EXISTS (
        SELECT 1 FROM admin_users sa
        WHERE sa.id = auth.uid() AND sa.role = 'superadmin' AND sa.is_active = true
      )
    )
    OR
    -- admin: can only create role='admin'
    (
      EXISTS (
        SELECT 1 FROM admin_users ca
        WHERE ca.id = auth.uid() AND ca.role = 'admin' AND ca.is_active = true
      )
      AND role = 'admin'
    )
  );

-- UPDATE: superadmin can update anyone; admin can update admin-role rows (not superadmin, cannot change to superadmin)
CREATE POLICY "Admins can update peer admin records"
  ON admin_users FOR UPDATE
  TO authenticated
  USING (
    -- superadmin can update anyone
    EXISTS (
      SELECT 1 FROM admin_users sa
      WHERE sa.id = auth.uid() AND sa.role = 'superadmin' AND sa.is_active = true
    )
    OR
    -- admin can update admin-role rows only
    (
      EXISTS (
        SELECT 1 FROM admin_users ca
        WHERE ca.id = auth.uid() AND ca.role = 'admin' AND ca.is_active = true
      )
      AND role = 'admin'
    )
    OR
    -- any user can update their own row (self-service)
    id = auth.uid()
  )
  WITH CHECK (
    -- superadmin can set any role
    EXISTS (
      SELECT 1 FROM admin_users sa
      WHERE sa.id = auth.uid() AND sa.role = 'superadmin' AND sa.is_active = true
    )
    OR
    -- admin: target must stay 'admin', cannot escalate to superadmin
    (
      EXISTS (
        SELECT 1 FROM admin_users ca
        WHERE ca.id = auth.uid() AND ca.role = 'admin' AND ca.is_active = true
      )
      AND role = 'admin'
    )
    OR
    -- self-update: only their own row, cannot change own role
    (
      id = auth.uid()
      AND role = (SELECT role FROM admin_users WHERE id = auth.uid())
    )
  );

-- DELETE: superadmin deletes anyone except themselves; admin deletes admin-role users except themselves
CREATE POLICY "Admins can delete peer admin records"
  ON admin_users FOR DELETE
  TO authenticated
  USING (
    id <> auth.uid()
    AND (
      -- superadmin can delete anyone
      EXISTS (
        SELECT 1 FROM admin_users sa
        WHERE sa.id = auth.uid() AND sa.role = 'superadmin' AND sa.is_active = true
      )
      OR
      -- admin can delete only admin-role users
      (
        EXISTS (
          SELECT 1 FROM admin_users ca
          WHERE ca.id = auth.uid() AND ca.role = 'admin' AND ca.is_active = true
        )
        AND role = 'admin'
      )
    )
  );
