-- Cleanup script - Run this first if you already tried the migration
-- This will remove any partially created objects

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_users;
DROP POLICY IF EXISTS "Managers can view organization members" ON organization_users;
DROP POLICY IF EXISTS "Managers can add members" ON organization_users;
DROP POLICY IF EXISTS "Managers can update member roles" ON organization_users;
DROP POLICY IF EXISTS "Managers can remove members" ON organization_users;

-- Drop the table if it exists (WARNING: This deletes data)
DROP TABLE IF EXISTS organization_users CASCADE;
