/*
  # Fix Document Chunks RLS for Organization Isolation

  1. Purpose
    - Ensure document chunks are only accessible to users within the same organization
    - Prevent cross-organization data leakage at the database level
    - Enforce organization-based access control for document chunks

  2. Changes
    - Update "Users can view chunks of published documents" policy
    - Add organization membership check to the policy
    - Ensure chunks are only visible to users in the document's organization

  3. Security
    - Users can only view chunks from documents in their organization
    - Admins can only manage chunks from documents in their organization
    - Complete organization isolation at the database level
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view chunks of published documents" ON public.document_chunks;

-- Create new policy with organization filtering
CREATE POLICY "Users can view chunks of published documents in their org"
    ON public.document_chunks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM policy_documents
            WHERE policy_documents.id = document_chunks.document_id
            AND policy_documents.status = 'published'
            AND policy_documents.is_enabled = true
            AND policy_documents.organization_id IN (
                SELECT organization_id FROM organization_users
                WHERE organization_users.user_id = auth.uid()
            )
        )
    );

-- Update admin policy to respect organization boundaries
DROP POLICY IF EXISTS "Admins can manage all chunks" ON public.document_chunks;

CREATE POLICY "Admins can manage chunks in their org"
    ON public.document_chunks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM policy_documents
            INNER JOIN organization_users ON policy_documents.organization_id = organization_users.organization_id
            WHERE policy_documents.id = document_chunks.document_id
            AND organization_users.user_id = auth.uid()
            AND organization_users.role IN ('hr_admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM policy_documents
            INNER JOIN organization_users ON policy_documents.organization_id = organization_users.organization_id
            WHERE policy_documents.id = document_chunks.document_id
            AND organization_users.user_id = auth.uid()
            AND organization_users.role IN ('hr_admin', 'manager')
        )
    );
