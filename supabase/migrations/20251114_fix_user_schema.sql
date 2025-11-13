-- Fix database schema - Remove organization fields from users table
-- These fields should only exist in the organization_users junction table

-- First, drop any policies that depend on organization_id, role, or department columns
DROP POLICY IF EXISTS "Users can update their organization" ON organizations;
DROP POLICY IF EXISTS "Managers and admins can manage org users" ON users;
DROP POLICY IF EXISTS "Managers can manage organization users" ON users;
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Managers and admins can view all users in org" ON users;

-- Remove organization-related columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS role CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS department CASCADE;

-- Note: The organization_users table already has the correct structure:
-- - user_id (references auth.users)
-- - organization_id (references organizations)
-- - role (employee, manager, hr_admin)

-- This makes organization_users the single source of truth for user-organization relationships
