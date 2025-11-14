-- Quick migration file for Supabase CLI
-- Run with: npx supabase db push

-- Fix policy_documents table policies
-- Drop ALL possible policy names (old and new)
DROP POLICY IF EXISTS "HR admins can manage all documents" ON policy_documents;
DROP POLICY IF EXISTS "Admins can manage all documents" ON policy_documents;
DROP POLICY IF EXISTS "Users can view published documents" ON policy_documents;

CREATE POLICY "Admins can manage all documents"
  ON policy_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.user_id = auth.uid()
      AND organization_users.role IN ('hr_admin', 'manager')
    )
  );

CREATE POLICY "Users can view published documents"
  ON policy_documents
  FOR SELECT
  TO authenticated
  USING (status = 'published');
