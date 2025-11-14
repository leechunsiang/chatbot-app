-- Fix document_chunks table RLS policies
-- Drop old policies
DROP POLICY IF EXISTS "HR admins can manage all chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Admins can manage all chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Users can view chunks of published documents" ON public.document_chunks;

-- Create new policies using organization_users table

-- Admins (hr_admin and manager) can manage all chunks
CREATE POLICY "Admins can manage all chunks"
    ON public.document_chunks
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
    ON public.document_chunks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM policy_documents
            WHERE policy_documents.id = document_chunks.document_id
            AND policy_documents.status = 'published'
        )
    );
