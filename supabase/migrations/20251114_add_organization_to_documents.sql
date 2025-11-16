-- Add organization_id to policy_documents and document_chunks tables
-- This enables organization-level data isolation

-- =====================================================
-- PART 1: Add organization_id to policy_documents
-- =====================================================

-- Add organization_id column
ALTER TABLE policy_documents 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_policy_documents_organization_id ON policy_documents(organization_id);

-- Backfill existing documents with organization_id from uploaded_by user
UPDATE policy_documents
SET organization_id = (
    SELECT organization_users.organization_id
    FROM organization_users
    WHERE organization_users.user_id = policy_documents.uploaded_by
    LIMIT 1
)
WHERE organization_id IS NULL AND uploaded_by IS NOT NULL;

-- =====================================================
-- PART 2: Update policy_documents RLS policies
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Admins can manage all documents" ON policy_documents;
DROP POLICY IF EXISTS "Users can view published documents" ON policy_documents;

-- Admins can manage documents in their organization
CREATE POLICY "Admins can manage org documents"
  ON policy_documents
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE organization_users.user_id = auth.uid()
      AND organization_users.role IN ('hr_admin', 'manager')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE organization_users.user_id = auth.uid()
      AND organization_users.role IN ('hr_admin', 'manager')
    )
  );

-- Users can view published documents in their organization(s)
CREATE POLICY "Users can view org published documents"
  ON policy_documents
  FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    AND organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE organization_users.user_id = auth.uid()
    )
  );

-- =====================================================
-- PART 3: Update document_chunks RLS policies
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Admins can manage all chunks" ON document_chunks;
DROP POLICY IF EXISTS "Users can view chunks of published documents" ON document_chunks;

-- Admins can manage chunks in their organization
CREATE POLICY "Admins can manage org chunks"
    ON document_chunks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM policy_documents
            WHERE policy_documents.id = document_chunks.document_id
            AND policy_documents.organization_id IN (
                SELECT organization_id FROM organization_users
                WHERE organization_users.user_id = auth.uid()
                AND organization_users.role IN ('hr_admin', 'manager')
            )
        )
    );

-- Users can view chunks of published documents in their organization
CREATE POLICY "Users can view org published chunks"
    ON document_chunks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM policy_documents
            WHERE policy_documents.id = document_chunks.document_id
            AND policy_documents.status = 'published'
            AND policy_documents.organization_id IN (
                SELECT organization_id FROM organization_users
                WHERE organization_users.user_id = auth.uid()
            )
        )
    );

-- =====================================================
-- PART 4: Update match_document_chunks function
-- =====================================================

-- Drop existing function first (required to change parameter names)
DROP FUNCTION IF EXISTS match_document_chunks(vector, float, int, uuid);
DROP FUNCTION IF EXISTS match_document_chunks(vector, float, int);

-- Create new function with organization filter
CREATE FUNCTION match_document_chunks(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_organization_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    content text,
    chunk_index integer,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        document_chunks.id,
        document_chunks.document_id,
        document_chunks.content,
        document_chunks.chunk_index,
        1 - (document_chunks.embedding <=> query_embedding) as similarity
    FROM document_chunks
    INNER JOIN policy_documents ON document_chunks.document_id = policy_documents.id
    WHERE 
        policy_documents.status = 'published'
        AND policy_documents.is_enabled = true
        AND (
            filter_organization_id IS NULL 
            OR policy_documents.organization_id = filter_organization_id
        )
        AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY document_chunks.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
