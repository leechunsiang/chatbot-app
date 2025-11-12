/*
  # Add Document Processing Status Tracking

  1. Changes to policy_documents table
    - Add `processing_status` column to track document processing state
    - Add `processed_at` timestamp column for when processing completed
    - Add `processing_error` column to store error messages
    - Add `extracted_text_length` column to track amount of text extracted
    - Add index on processing_status for efficient querying

  2. Possible values for processing_status
    - 'pending': Document uploaded but not yet processed
    - 'processing': Currently extracting text from PDF
    - 'completed': Text extraction successful
    - 'failed': Text extraction failed

  3. Purpose
    - Track the status of PDF text extraction
    - Store error messages for failed processing
    - Enable manual reprocessing of failed documents
    - Show processing progress to users
*/

-- Add processing status columns to policy_documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policy_documents' AND column_name = 'processing_status'
  ) THEN
    ALTER TABLE public.policy_documents 
    ADD COLUMN processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policy_documents' AND column_name = 'processed_at'
  ) THEN
    ALTER TABLE public.policy_documents 
    ADD COLUMN processed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policy_documents' AND column_name = 'processing_error'
  ) THEN
    ALTER TABLE public.policy_documents 
    ADD COLUMN processing_error TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policy_documents' AND column_name = 'extracted_text_length'
  ) THEN
    ALTER TABLE public.policy_documents 
    ADD COLUMN extracted_text_length INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create index on processing_status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_policy_documents_processing_status 
ON public.policy_documents(processing_status);

-- Update existing documents to have 'pending' status if they don't have text extracted
UPDATE public.policy_documents 
SET processing_status = 'pending' 
WHERE processing_status IS NULL;
