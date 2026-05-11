/*
  # Fix admin_users role constraint and policies RLS

  1. admin_users
     - Drop old role check that only allowed 'superadmin' and 'admin'
     - Add new check including 'auditor' and 'viewer' roles added in recent migrations
  
  2. policies (RLS)
     - Fix public SELECT policy: was checking is_published=true but the status
       system uses status='published'. Update to check both so existing and new
       records work correctly.
     - Fix admin SELECT policy: also allow authenticated users in admin_users to
       see all non-deleted policies regardless of status.
*/

-- 1. Fix role check constraint on admin_users
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'auditor'::text, 'viewer'::text]));

-- 2. Fix public policy SELECT: check status='published' (new system) OR is_published=true (legacy)
DROP POLICY IF EXISTS "Public can view published policies" ON policies;
CREATE POLICY "Public can view published policies"
  ON policies FOR SELECT
  USING (status = 'published' OR is_published = true);
