/*
  # Enhance Document Search with Metadata

  1. Changes
    - Updates match_document_chunks function to return document metadata
    - Includes document title, category, and description in results
    - Provides better context for AI to understand which policy area chunks belong to

  2. Benefits
    - AI can better understand the policy context of each chunk
    - Improved matching of user questions to relevant policy documents
    - Better user experience with more contextual answers
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS match_document_chunks(vector, float, int, uuid);

-- Create enhanced function with document metadata
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
    similarity float,
    document_title text,
    document_category text,
    document_description text
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
        1 - (document_chunks.embedding <=> query_embedding) as similarity,
        policy_documents.title as document_title,
        policy_documents.category as document_category,
        policy_documents.description as document_description
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
