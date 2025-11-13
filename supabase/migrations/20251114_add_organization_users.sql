-- Create organization_users junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee', 'manager', 'hr_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id),
  CONSTRAINT fk_organization_users_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_organization_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organization_users_user_id ON organization_users(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_organization_id ON organization_users(organization_id);

-- Enable RLS
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view memberships" ON organization_users;
DROP POLICY IF EXISTS "Allow authenticated users to add memberships" ON organization_users;
DROP POLICY IF EXISTS "Allow users to update memberships" ON organization_users;
DROP POLICY IF EXISTS "Allow users to remove memberships" ON organization_users;

-- Policy: Allow all authenticated users to read organization_users (simplest approach)
-- Access control is handled in the application layer
CREATE POLICY "Allow authenticated users to view memberships"
  ON organization_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert (will be used when creating orgs or adding users)
CREATE POLICY "Allow authenticated users to add memberships"
  ON organization_users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow users to update memberships in their organizations
CREATE POLICY "Allow users to update memberships"
  ON organization_users
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'hr_admin')
    )
  );

-- Policy: Allow users to delete memberships in their organizations
CREATE POLICY "Allow users to remove memberships"
  ON organization_users
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'hr_admin')
    )
  );

-- Migrate existing data from users table to organization_users (only if columns still exist)
-- This will be skipped if you've already run the fix_user_schema migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'organization_id'
  ) THEN
    INSERT INTO organization_users (user_id, organization_id, role)
    SELECT id, organization_id, role
    FROM users
    WHERE organization_id IS NOT NULL
    ON CONFLICT (user_id, organization_id) DO NOTHING;
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE organization_users IS 'Junction table for many-to-many relationship between users and organizations';
