-- Complete RLS Policy Fix for Document Upload
-- This fixes storage.objects, policy_documents, and document_chunks table policies

-- =====================================================
-- PART 1: Fix policy_documents table policies
-- =====================================================

-- Drop old policies on policy_documents
DROP POLICY IF EXISTS "HR admins can manage all documents" ON policy_documents;
DROP POLICY IF EXISTS "Admins can manage all documents" ON policy_documents;
DROP POLICY IF EXISTS "Users can view published documents" ON policy_documents;

-- Create new policies that work with organization_users table

-- Policy: Users with hr_admin or manager role can manage all documents
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

-- Policy: All authenticated users can view published documents
CREATE POLICY "Users can view published documents"
  ON policy_documents
  FOR SELECT
  TO authenticated
  USING (status = 'published');

-- =====================================================
-- PART 2: Fix document_chunks table policies
-- =====================================================

-- Drop old policies on document_chunks
DROP POLICY IF EXISTS "HR admins can manage all chunks" ON document_chunks;
DROP POLICY IF EXISTS "Admins can manage all chunks" ON document_chunks;
DROP POLICY IF EXISTS "Users can view chunks of published documents" ON document_chunks;

-- Admins can manage all chunks
CREATE POLICY "Admins can manage all chunks"
    ON document_chunks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM organization_users
            WHERE organization_users.user_id = auth.uid()
            AND organization_users.role IN ('hr_admin', 'manager')
        )
    );

-- All authenticated users can view chunks of published documents
CREATE POLICY "Users can view chunks of published documents"
    ON document_chunks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM policy_documents
            WHERE policy_documents.id = document_chunks.document_id
            AND policy_documents.status = 'published'
        )
    );

-- =====================================================
-- PART 3: Fix storage bucket policies
-- =====================================================

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('policy-documents', 'policy-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Drop ALL existing storage policies
DROP POLICY IF EXISTS "Authenticated users can view policy documents" ON storage.objects;
DROP POLICY IF EXISTS "HR admins can upload policy documents" ON storage.objects;
DROP POLICY IF EXISTS "HR admins can update policy documents" ON storage.objects;
DROP POLICY IF EXISTS "HR admins can delete policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to update documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to delete documents" ON storage.objects;

-- Create new storage policies

-- Allow all authenticated users to view/download documents
CREATE POLICY "Authenticated users can view documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'policy-documents');

-- Allow hr_admin and manager to upload documents
CREATE POLICY "Admins can upload documents"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'policy-documents'
        AND EXISTS (
            SELECT 1 FROM organization_users
            WHERE organization_users.user_id = auth.uid()
            AND organization_users.role IN ('hr_admin', 'manager')
        )
    );

-- Allow hr_admin and manager to update documents
CREATE POLICY "Admins can update documents"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'policy-documents'
        AND EXISTS (
            SELECT 1 FROM organization_users
            WHERE organization_users.user_id = auth.uid()
            AND organization_users.role IN ('hr_admin', 'manager')
        )
    );

-- Allow hr_admin and manager to delete documents
CREATE POLICY "Admins can delete documents"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'policy-documents'
        AND EXISTS (
            SELECT 1 FROM organization_users
            WHERE organization_users.user_id = auth.uid()
            AND organization_users.role IN ('hr_admin', 'manager')
        )
    );

-- =====================================================
-- VERIFICATION QUERIES (Optional - uncomment to run)
-- =====================================================

-- Check your current role
-- SELECT role FROM organization_users WHERE user_id = auth.uid();

-- Check policy_documents policies
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'policy_documents';

-- Check storage policies
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Check bucket exists
-- SELECT * FROM storage.buckets WHERE id = 'policy-documents';
