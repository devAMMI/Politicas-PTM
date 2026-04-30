/*
  # Add performance indexes and auto-updated_at trigger for policies

  1. Indexes
     - policies.is_published + published_at (most common query: published policies sorted by date)
     - policies.slug (unique lookups by slug)
     - admin_users.role (filter by role)

  2. Trigger
     - auto-sets updated_at = now() on any UPDATE to policies table
*/

-- Indexes
CREATE INDEX IF NOT EXISTS idx_policies_published_at ON policies (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_policies_slug ON policies (slug);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users (role);

-- Auto updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS policies_set_updated_at ON policies;
CREATE TRIGGER policies_set_updated_at
  BEFORE UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
