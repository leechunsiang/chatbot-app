/*
  # Auto-Complete Document Processing Status When Chunks Are Added

  1. Purpose
    - Automatically update document processing_status to 'completed' when chunks are successfully added
    - Ensure processing_status always reflects the actual state of document processing
    - Fix data integrity issues where documents have chunks but wrong status

  2. Changes
    - Create trigger function that runs when document_chunks are inserted
    - Trigger updates parent document's processing_status to 'completed'
    - Sets processed_at timestamp
    - Clears any processing_error
    - Updates extracted_text_length based on chunk content

  3. Migration Tasks
    - Create the trigger function
    - Attach trigger to document_chunks table
    - Fix existing documents that have chunks but wrong status
    - Add helper function to validate processing status consistency
*/

-- Create trigger function to auto-complete processing status
CREATE OR REPLACE FUNCTION auto_complete_document_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  total_text_length INTEGER;
  chunk_count INTEGER;
BEGIN
  -- Get total text length and chunk count for this document
  SELECT
    SUM(LENGTH(content))::INTEGER,
    COUNT(*)::INTEGER
  INTO total_text_length, chunk_count
  FROM document_chunks
  WHERE document_id = NEW.document_id;

  -- Update document status to completed if it's currently processing or pending
  UPDATE policy_documents
  SET
    processing_status = 'completed',
    processed_at = NOW(),
    processing_error = NULL,
    extracted_text_length = COALESCE(total_text_length, 0)
  WHERE
    id = NEW.document_id
    AND processing_status IN ('pending', 'processing');

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_complete_processing ON document_chunks;

-- Create trigger that fires after each chunk insert
CREATE TRIGGER trigger_auto_complete_processing
  AFTER INSERT ON document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_document_processing();

-- Fix existing documents that have chunks but wrong status
UPDATE policy_documents pd
SET
  processing_status = 'completed',
  processed_at = COALESCE(pd.processed_at, NOW()),
  processing_error = NULL,
  extracted_text_length = (
    SELECT COALESCE(SUM(LENGTH(content)), 0)::INTEGER
    FROM document_chunks dc
    WHERE dc.document_id = pd.id
  )
WHERE
  id IN (
    SELECT DISTINCT document_id
    FROM document_chunks
  )
  AND processing_status IN ('pending', 'processing');

-- Create function to validate and fix processing status consistency
CREATE OR REPLACE FUNCTION validate_processing_status()
RETURNS TABLE (
  document_id UUID,
  current_status TEXT,
  chunk_count BIGINT,
  issue TEXT,
  suggested_status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pd.id as document_id,
    pd.processing_status as current_status,
    COUNT(dc.id) as chunk_count,
    CASE
      WHEN COUNT(dc.id) > 0 AND pd.processing_status != 'completed'
        THEN 'Has chunks but status is not completed'
      WHEN COUNT(dc.id) = 0 AND pd.processing_status = 'completed'
        THEN 'Status is completed but has no chunks'
      WHEN pd.processing_status = 'processing' AND pd.created_at < NOW() - INTERVAL '10 minutes'
        THEN 'Stuck in processing for more than 10 minutes'
      ELSE 'Status appears correct'
    END as issue,
    CASE
      WHEN COUNT(dc.id) > 0 THEN 'completed'
      WHEN COUNT(dc.id) = 0 AND pd.processing_status = 'completed' THEN 'pending'
      ELSE pd.processing_status
    END as suggested_status
  FROM policy_documents pd
  LEFT JOIN document_chunks dc ON pd.id = dc.document_id
  WHERE pd.status = 'published'
  GROUP BY pd.id, pd.processing_status, pd.created_at;
END;
$$;

-- Create helper function to fix all inconsistent statuses
CREATE OR REPLACE FUNCTION fix_all_processing_statuses()
RETURNS TABLE (
  fixed_count INTEGER,
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  documents_fixed INTEGER := 0;
  rows_affected INTEGER;
BEGIN
  -- Fix documents with chunks but wrong status
  UPDATE policy_documents pd
  SET
    processing_status = 'completed',
    processed_at = NOW(),
    processing_error = NULL,
    extracted_text_length = (
      SELECT COALESCE(SUM(LENGTH(content)), 0)::INTEGER
      FROM document_chunks dc
      WHERE dc.document_id = pd.id
    )
  WHERE
    id IN (
      SELECT pd2.id
      FROM policy_documents pd2
      INNER JOIN document_chunks dc2 ON pd2.id = dc2.document_id
      WHERE pd2.processing_status != 'completed'
      GROUP BY pd2.id
    );

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  documents_fixed := documents_fixed + rows_affected;

  -- Fix documents marked completed but have no chunks (reset to pending)
  UPDATE policy_documents
  SET
    processing_status = 'pending',
    processed_at = NULL,
    extracted_text_length = 0
  WHERE
    processing_status = 'completed'
    AND id NOT IN (SELECT DISTINCT document_id FROM document_chunks);

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  documents_fixed := documents_fixed + rows_affected;

  -- Mark stuck processing documents as failed
  UPDATE policy_documents
  SET
    processing_status = 'failed',
    processing_error = 'Processing timeout - document was stuck in processing state for more than 10 minutes'
  WHERE
    processing_status = 'processing'
    AND created_at < NOW() - INTERVAL '10 minutes'
    AND id NOT IN (SELECT DISTINCT document_id FROM document_chunks);

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  documents_fixed := documents_fixed + rows_affected;

  RETURN QUERY SELECT documents_fixed, 'Fixed ' || documents_fixed || ' documents with inconsistent processing status';
END;
$$;

-- Add comment to document the trigger
COMMENT ON TRIGGER trigger_auto_complete_processing ON document_chunks IS
  'Automatically updates document processing_status to completed when chunks are successfully inserted';

COMMENT ON FUNCTION auto_complete_document_processing() IS
  'Trigger function that marks documents as completed when their chunks are created';

COMMENT ON FUNCTION validate_processing_status() IS
  'Returns documents with inconsistent processing status for debugging';

COMMENT ON FUNCTION fix_all_processing_statuses() IS
  'Fixes all documents with inconsistent processing status';
