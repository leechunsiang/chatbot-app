-- Add is_enabled column to policy_documents table
-- This allows documents to be temporarily disabled from RAG without unpublishing them

-- Add is_enabled column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'policy_documents' AND column_name = 'is_enabled'
    ) THEN
        ALTER TABLE public.policy_documents 
        ADD COLUMN is_enabled BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_policy_documents_is_enabled 
ON public.policy_documents(is_enabled);

-- Set all existing documents to enabled
UPDATE public.policy_documents 
SET is_enabled = true 
WHERE is_enabled IS NULL;

-- Update the match_document_chunks function to filter by is_enabled
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_document_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    content text,
    chunk_index integer,
    similarity float
)
LANGUAGE plpgsql
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
        AND (filter_document_id IS NULL OR document_chunks.document_id = filter_document_id)
        AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY document_chunks.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Update the RLS policy for viewing chunks to include is_enabled check
DROP POLICY IF EXISTS "Users can view chunks of published documents" ON public.document_chunks;

CREATE POLICY "Users can view chunks of published documents"
    ON public.document_chunks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.policy_documents
            WHERE policy_documents.id = document_chunks.document_id
            AND policy_documents.status = 'published'
            AND policy_documents.is_enabled = true
        )
    );
