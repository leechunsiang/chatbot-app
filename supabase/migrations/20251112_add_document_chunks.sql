-- Create document_chunks table for storing document content with embeddings
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.policy_documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON public.document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- Enable RLS
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Policies for document_chunks
-- HR admins can manage all chunks
CREATE POLICY "HR admins can manage all chunks"
    ON public.document_chunks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'hr_admin'
        )
    );

-- All authenticated users can view chunks of published documents
CREATE POLICY "Users can view chunks of published documents"
    ON public.document_chunks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.policy_documents
            WHERE policy_documents.id = document_chunks.document_id
            AND policy_documents.status = 'published'
        )
    );

-- Function to search for similar document chunks
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
        AND (filter_document_id IS NULL OR document_chunks.document_id = filter_document_id)
        AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY document_chunks.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
